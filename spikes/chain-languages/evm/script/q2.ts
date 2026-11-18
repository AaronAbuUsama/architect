// Q2: someone else's contract. (a) read it + follow its events through an ABI-typed adapter. (b) our contract calls it.
import { encodeFunctionData, type Address } from "viem";
import { tokenAdapter } from "../src-ts/adapter/token.ts";
import { gatedDaoAbi, pausedTokenAbi, testTokenAbi } from "../gen/abi.ts";
import { decodeRevert, type Decoded } from "./decode.ts";
import { accountsOf, deploy, log, publicClient, rawCall, startAnvil, walletFor } from "./lib.ts";
import { pad, toHex } from "viem";

const id = (n: number) => pad(toHex(n), { size: 32 });
const anvil = await startAnvil();
try {
  const acc = await accountsOf();
  const pc = publicClient();
  const admin = acc[0]!, tokenDeployer = acc[9]!;
  const wait = (h: `0x${string}`) => pc.waitForTransactionReceipt({ hash: h });

  console.log("== (a) someone else's token, read through an ABI-typed adapter");
  const token = await deploy("TestToken", tokenDeployer);
  log("token deployed by account 9; our admin is account 0; different deployers", { token, deployer: tokenDeployer, ourAdmin: admin });
  const a = tokenAdapter(pc, token);
  const w9 = walletFor(tokenDeployer);
  await wait(await w9.writeContract({ address: token, abi: testTokenAbi, functionName: "mint", args: [acc[1]!, 1n] }));
  await wait(await w9.writeContract({ address: token, abi: testTokenAbi, functionName: "mint", args: [acc[2]!, 1n] }));
  log("balanceOf(acct1)", await a.balanceOf(acc[1]!));
  log("balanceOf(acct3)", await a.balanceOf(acc[3]!));
  await wait(await walletFor(acc[2]!).writeContract({ address: token, abi: testTokenAbi, functionName: "transfer", args: [acc[3]!, 1n] }));
  const evs = await a.transfers(0n);
  log("Transfer events followed (typed args)", evs.map((e) => ({ block: e.blockNumber, from: e.args.from, to: e.args.to, value: e.args.value })));
  log("their Transfer topic0 is theirs: keccak of Transfer(address,address,uint256)", evs[0]!.topics[0]);

  console.log("\n== (b) GatedDao: vote requires >= 1 unit of their token");
  const mk = async (gate: Address, wrap: boolean) => deploy("GatedDao", admin, [admin, gate, wrap]);
  const gated = await mk(token, false);
  const send = async (from: Address, to: Address, fn: "addMember" | "open" | "vote", args: unknown[]) => {
    const data = encodeFunctionData({ abi: gatedDaoAbi, functionName: fn, args } as never);
    const sim = await rawCall({ from, to, data });
    if (!sim.ok) return { refused: decodeRevert(sim.data, gatedDaoAbi, { PausedToken: pausedTokenAbi }), raw: sim.data };
    await wait(await walletFor(from).sendTransaction({ to, data }));
    return { ok: true };
  };
  for (const m of [1, 2, 3]) await send(admin, gated, "addMember", [acc[m]!]);
  await send(admin, gated, "open", [id(1), id(111)]);
  // account 3 got the token via transfer above, account 2 gave it away: the gate follows THEIR state
  log("vote acct1 (holds)", await send(acc[1]!, gated, "vote", [id(1), 1]));
  log("vote acct2 (gave it away)", await send(acc[2]!, gated, "vote", [id(1), 1]));
  log("vote acct3 (received it)", await send(acc[3]!, gated, "vote", [id(1), 0]));

  console.log("\n== a revert INSIDE their contract: how it reaches our decoder (bubble vs wrap)");
  const hostile: Record<string, Address> = {};
  for (const n of ["PausedToken", "StringToken", "PanicToken", "GasHogToken"]) hostile[n] = await deploy("Hostile", tokenDeployer, [], n);
  hostile.EOA = acc[8]!; // not a contract at all
  const table: Record<string, Record<string, string>> = {};
  const show = (d: Decoded) => d.kind === "foreign" ? `foreign ${d.from}.${d.name}(${JSON.stringify(d.args, (_, v) => typeof v === "bigint" ? Number(v) : v)})` : d.kind === "own-uncoded" ? `own-uncoded ${d.name}` : d.kind === "panic" ? `panic 0x${d.code.toString(16)} (${d.meaning})` : d.kind === "string" ? `string "${d.message}"` : d.kind === "unknown" ? `UNKNOWN ${d.selector}` : d.kind;
  for (const [name, gate] of Object.entries(hostile)) {
    table[name] = {};
    for (const wrap of [false, true]) {
      const dao = await mk(gate, wrap);
      await send(admin, dao, "addMember", [acc[1]!]); await send(admin, dao, "open", [id(1), id(1)]);
      const data = encodeFunctionData({ abi: gatedDaoAbi, functionName: "vote", args: [id(1), 1] });
      const sim = await rawCall({ from: acc[1]!, to: dao, data, gas: "0x7a120" }); // 500k gas: a gas hog must not burn the 30M default
      let d = decodeRevert(sim.ok ? undefined : sim.data, gatedDaoAbi, name === "PausedToken" ? { PausedToken: pausedTokenAbi } : {});
      let extra = "";
      if (d.kind === "own-uncoded" && d.name === "GateCallFailed") {
        const reason = (d.args as [Address, `0x${string}`])[1];
        extra = ` -> inner reason ${reason.length > 2 ? "[" + reason.slice(0, 10) + "..] = " : ""}${show(decodeRevert(reason, gatedDaoAbi, name === "PausedToken" ? { PausedToken: pausedTokenAbi } : {}))}`;
      }
      table[name]![wrap ? "wrap" : "bubble"] = `${show(d)}${extra}  | node message: ${sim.ok ? "-" : sim.message} | raw ${sim.ok ? "-" : (sim.data ?? "none").slice(0, 74)}`;
    }
  }
  for (const [n, r] of Object.entries(table)) { console.log(n); for (const [m, v] of Object.entries(r)) console.log(`   ${m.padEnd(6)} ${v}`); }
} finally { anvil.stop(); }
