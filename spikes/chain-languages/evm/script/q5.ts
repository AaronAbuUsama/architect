// Q5: every refusal from raw revert bytes to a typed object + stable code; what makes a code unstable; what has no code.
import { decodeAbiParameters, decodeErrorResult, encodeAbiParameters, encodeErrorResult, hexToString, stringToHex, type Hex, toFunctionSelector } from "viem";
import { codedDaoAbi, gatedDaoAbi, miniDaoAbi } from "../gen/abi.ts";
import { daoAt, id } from "./dao.ts";
import { CODES, decodeRevert } from "./decode.ts";
import { accountsOf, artifact, deploy, log, publicClient, rawCall, rpc, startAnvil, walletFor } from "./lib.ts";

const anvil = await startAnvil();
try {
  const acc = await accountsOf(); const pc = publicClient();
  const admin = acc[0]!;
  const dao = daoAt(await deploy("MiniDao", admin, [admin]));
  for (const m of [1, 2, 3]) await dao.send(admin, "addMember", [acc[m]!]);
  await dao.send(admin, "open", [id(1), id(11)]); await dao.send(admin, "open", [id(2), id(22)]);
  await dao.send(acc[1]!, "vote", [id(1), 1]);
  await dao.send(admin, "close", [id(2)]);

  console.log("== 1. our four refusals: raw revert data -> typed object with the stable code");
  const show = async (label: string, r: ReturnType<typeof dao.sim>) => { const x = await r; console.log(`${label.padEnd(34)} ${x.ok ? "OK" : `${x.raw}  ->  ${JSON.stringify(x.refusal, (_, v) => typeof v === "bigint" ? Number(v) : v)}`}`); return x; };
  await show("outsider vote (AR-001)", dao.sim(acc[5]!, "vote", [id(1), 1]));
  await show("member opens (AR-001)", dao.sim(acc[1]!, "open", [id(3), id(1)]));
  await show("outsider closes (AR-001)", dao.sim(acc[5]!, "close", [id(1)]));
  await show("member adds member (AR-001)", dao.sim(acc[1]!, "addMember", [acc[5]!]));
  await show("open twice (PR-002)", dao.sim(admin, "open", [id(1), id(1)]));
  await show("vote, never opened (PR-900 absent)", dao.sim(acc[1]!, "vote", [id(9), 1]));
  await show("vote on closed (PR-900 passed/failed)", dao.sim(acc[2]!, "vote", [id(2), 1]));
  await show("close twice (PR-900)", dao.sim(admin, "close", [id(2)]));
  await show("vote twice (PR-001)", dao.sim(acc[1]!, "vote", [id(1), 0]));
  await show("check order: outsider + absent + dup", dao.sim(acc[5]!, "vote", [id(9), 1]));

  console.log("\n== 2. refusals that arrive with NO code");
  const to = dao.address; const from = acc[1]!;
  const voteData = dao.data("vote", [id(1), 1]);
  const raw = async (label: string, r: Promise<ReturnType<typeof rawCall> extends Promise<infer T> ? T : never>) => { const x = await r; console.log(`${label.padEnd(44)} ${x.ok ? "ok " + x.data : `data=${x.data ?? "(none)"}  decoded=${JSON.stringify(decodeRevert(x.data, miniDaoAbi))}  node="${x.message}" rpc-code=${x.code}`}`); };
  await raw("enum out of range (choice=2), calldata-decoded", rawCall({ from: acc[2]!, to, data: (voteData.slice(0, -1) + "2") as Hex }));
  await raw("calldata too short (selector only)", rawCall({ from, to, data: voteData.slice(0, 10) as Hex }));
  await raw("unknown selector 0xdeadbeef (no fallback)", rawCall({ from, to, data: "0xdeadbeef" }));
  await raw("eth_call with gas=22000 (out of gas)", rawCall({ from: acc[2]!, to, data: voteData, gas: "0x55f0" }));
  await raw("eth_call with gas=21000 (intrinsic)", rawCall({ from: acc[2]!, to, data: voteData, gas: "0x5208" }));
  const hash = await walletFor(acc[2]!).sendTransaction({ to, data: voteData, gas: 30_000n });
  const rc = await pc.waitForTransactionReceipt({ hash });
  log("mined with gas=30000 (OOG during execution)", { status: rc.status, gasUsed: rc.gasUsed, logs: rc.logs.length });
  const est = await rpc("eth_estimateGas", [{ from: acc[1], to, data: voteData }]).then(() => "estimated", (e: any) => ({ code: e.code, data: e.cause?.data ?? e.data }));
  log("eth_estimateGas for a tx that will revert (acct1 already voted)", est);
  const nb = await pc.getBlockNumber();
  const sentAnyway = await walletFor(acc[1]!).sendTransaction({ to, data: voteData }).then(async (h) => (await pc.waitForTransactionReceipt({ hash: h })).status, (e: any) => "refused by node: " + String(e.details ?? e.message).split("\n")[0]);
  log("eth_sendTransaction (unlocked account, no gas given) of that same doomed tx", { result: sentAnyway, blocksMined: Number((await pc.getBlockNumber()) - nb) });
  const traced = await rpc<any>("debug_traceTransaction", [hash, { tracer: "callTracer" }]).catch((e: any) => "debug_traceTransaction: " + String(e.message).split("\n")[0]);
  log("trace of the OOG tx", typeof traced === "string" ? traced : { error: traced.error, output: traced.output, gasUsed: traced.gasUsed });
  const hash2 = await walletFor(acc[1]!).sendTransaction({ to, data: dao.data("vote", [id(1), 1]), gas: 1_000_000n });
  await pc.waitForTransactionReceipt({ hash: hash2 });
  const t2 = await rpc<any>("debug_traceTransaction", [hash2, { tracer: "callTracer" }]).catch(() => null);
  log("trace of a mined AlreadyVoted revert (reason is recoverable from the trace, not the receipt)", t2 && { error: t2.error, output: t2.output, decoded: decodeRevert(t2.output, miniDaoAbi) });

  console.log("\n== 3. what makes a code unstable? compile 6 shapes of the same two errors, decode with the V0 (old client) ABI");
  const shapes = ["V0_Original", "V1_Renamed", "V2_FieldAdded", "V3_Reordered", "V4_FieldRenamed", "V5_TypeWidened"];
  const oldAbi = artifact("Variants", "V0_Original").abi;
  const rows: Record<string, Record<string, string>> = {};
  for (const s of shapes) {
    const a = artifact("Variants", s); const addr = await deploy("Variants", admin, [], s);
    const items = (a.abi as any[]).filter((i) => i.type === "error");
    const sel = (n: string) => { const i = items.find((x) => x.name === n); return i ? toFunctionSelector(`${i.name}(${i.inputs.map((x: any) => x.type).join(",")})`) : "-"; };
    const callA = await rawCall({ from: admin, to: addr, data: toFunctionSelector("a()") });
    const callB = await rawCall({ from: admin, to: addr, data: toFunctionSelector("b()") });
    const dec = (r: any) => { const d = decodeRevert(r.data, oldAbi); return d.kind === "refusal" ? d.code : `UNDECODABLE(${d.kind} ${r.data?.slice(0, 10)})`; };
    rows[s] = { "ABI error order": items.map((x) => x.name).join(","), "sel of 1st declared (a)": s === "V1_Renamed" ? sel("HasVoted") : sel("AlreadyVoted"), "sel ProposalExists": sel("ProposalExists"), "old client reads a() as": dec(callA), "old client reads b() as": dec(callB) };
  }
  console.table(rows);
  log("ordinal code a generator would derive from declaration order, V0", { AlreadyVoted: "PR-001", ProposalExists: "PR-002" });
  log("ordinal code, V3 (same selectors, reordered source)", { AlreadyVoted: "PR-002", ProposalExists: "PR-001" });
  log("the lesson", "selector = keccak(name + field TYPES): a rename or type change moves it; field NAMES and source ORDER do not. Order only matters if the code is derived from order.");

  console.log("\n== 4. the alternative: the code travels inside the error: error Refused(bytes6 code, bytes data)");
  const coded = daoAt(await deploy("CodedDao", admin, [admin]), codedDaoAbi);
  const encodeFn = (fn: string, args: unknown[]) => coded.data(fn as never, args);
  for (const [f, fn, args] of [[admin, "addMember", [acc[1]!]], [admin, "open", [id(1)]], [acc[1]!, "vote", [id(1)]]] as const) {
    const h = await walletFor(f).sendTransaction({ to: coded.address, data: encodeFn(fn, args as never), gas: 200000n });
    const r = await pc.waitForTransactionReceipt({ hash: h }); if (r.status !== "success") throw new Error("setup " + fn);
  }
  const SCHEMA: Record<string, readonly { type: string; name: string }[]> = { "PR-001": [{ type: "bytes32", name: "proposal" }], "PR-002": [{ type: "bytes32", name: "proposal" }], "PR-900": [{ type: "uint8", name: "state" }], "AR-001": [] };
  const decodeCoded = (data: Hex | undefined, schema = SCHEMA) => {
    if (!data || data === "0x") return { kind: "empty" };
    try {
      const r = decodeErrorResult({ abi: codedDaoAbi, data });
      if (r.errorName !== "Refused") return { kind: "other", name: r.errorName };
      const [codeHex, payload] = r.args as [Hex, Hex]; const code = hexToString(codeHex, { size: 6 });
      const fields = schema[code];
      return fields ? { kind: "refusal", code, args: payload === "0x" || fields.length === 0 ? {} : Object.fromEntries((decodeAbiParameters(fields as never, payload) as readonly unknown[]).map((v, i) => [fields[i]!.name, v])) } : { kind: "refusal-unknown-code", code };
    } catch { return { kind: "unknown", selector: data.slice(0, 10) }; }
  };
  const c = (from: any, fn: string, args: unknown[]) => rawCall({ from, to: coded.address, data: encodeFn(fn, args) });
  for (const [label, r] of [["vote twice", await c(acc[1], "vote", [id(1)])], ["open twice", await c(admin, "open", [id(1)])], ["outsider", await c(acc[5], "vote", [id(1)])], ["never opened", await c(acc[1], "vote", [id(7)])]] as const) {
    if (!r.ok) console.log(`${label.padEnd(14)} ${r.data!.length / 2 - 1} bytes  ${JSON.stringify(decodeCoded(r.data), (_, v) => typeof v === "bigint" ? Number(v) : v)}  raw=${r.data!.slice(0, 74)}...`);
  }
  console.log("  (the plain-error version of 'vote twice' is 36 bytes: selector + 1 word)");
  console.log("  robustness, same scenarios as the table above, for the 'Refused' encoding:");
  const R = (name: string, code: string, payload: Hex) => encodeErrorResult({ abi: codedDaoAbi, errorName: "Refused", args: [stringToHex(code, { size: 6 }), payload] });
  const p1 = encodeAbiParameters([{ type: "bytes32" }], [id(1)]);
  const p2 = encodeAbiParameters([{ type: "bytes32" }, { type: "address" }], [id(1), acc[1]!]);
  const cases: [string, Hex][] = [["V0 original", R("AlreadyVoted", "PR-001", p1)], ["V1 renamed in source (same code)", R("HasVoted", "PR-001", p1)], ["V2 field added (voter)", R("AlreadyVoted", "PR-001", p2)], ["V3 reordered source", R("AlreadyVoted", "PR-001", p1)], ["V5 type widened to uint256", R("AlreadyVoted", "PR-001", encodeAbiParameters([{ type: "uint256" }], [1n]))]];
  for (const [l, d] of cases) console.log(`    old client (schema: bytes32 proposal) reads ${l.padEnd(36)} -> ${JSON.stringify(decodeCoded(d), (_, v) => typeof v === "bigint" ? Number(v) : v)}`);
  console.log("  note: V2 decodes (extra trailing bytes ignored) so a ADDED field is backward compatible; a CHANGED type (V5) decodes silently to the same bytes here but is only safe because bytes32/uint256 are both one word: schema check must be exact.");

  console.log("\n== 5. a code from an unknown-selector world: what an old client sees when the contract was redeployed with a renamed error");
  const renamed = await rawCall({ from: admin, to: (await deploy("Variants", admin, [], "V1_Renamed")), data: toFunctionSelector("a()") });
  log("decoded by a client built before the rename", decodeRevert(renamed.ok ? undefined : renamed.data, oldAbi));
  log("codes registry the blueprint owns", CODES);

  console.log("\n== 6. their panic reaches us as a panic, with no code and no origin");
  const gd = daoAt(await deploy("GatedDao", admin, [admin, await deploy("Hostile", acc[9]!, [], "PanicToken"), false]), gatedDaoAbi);
  await gd.send(admin, "addMember", [acc[1]!]); await gd.send(admin, "open", [id(1), id(1)]);
  log("vote against a token whose balanceOf divides by zero", (await gd.sim(acc[1]!, "vote", [id(1), 1])));
} finally { anvil.stop(); }
