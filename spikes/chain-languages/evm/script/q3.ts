// Q3: signer vs submitter. A direct member transaction, and an EIP-712 signature relayed by another key.
import { decodeEventLog, type Address } from "viem";
import { miniDaoAbi } from "../gen/abi.ts";
import { daoAt, id } from "./dao.ts";
import { accountsOf, deploy, log, publicClient, rpc, startAnvil, walletFor } from "./lib.ts";

const anvil = await startAnvil();
try {
  const acc = await accountsOf(); const pc = publicClient();
  const admin = acc[0]!, relayer = acc[7]!, relayer2 = acc[8]!;
  const dao = daoAt(await deploy("MiniDao", admin, [admin]));
  for (const m of [1, 2, 3, 4]) await dao.send(admin, "addMember", [acc[m]!]);
  await dao.send(admin, "open", [id(1), id(111)]);
  await dao.send(admin, "open", [id(2), id(222)]);
  const bal = (a: Address) => pc.getBalance({ address: a });
  const votes = (r: Awaited<ReturnType<typeof dao.send>>) => r.logs.map((l) => { try { return decodeEventLog({ abi: miniDaoAbi, data: l.data, topics: l.topics }); } catch { return null; } }).filter(Boolean);

  const sign = async (signer: Address, proposal: bigint, choice: 0 | 1, nonce: bigint, deadline: bigint) =>
    walletFor(signer).signTypedData({ // eth_signTypedData_v4 on the node: no key ever leaves Anvil
      domain: { name: "Governance", version: "1", chainId: 31337, verifyingContract: dao.address },
      types: { Vote: [{ name: "proposal", type: "bytes32" }, { name: "choice", type: "uint8" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] },
      primaryType: "Vote", message: { proposal: id(proposal), choice, nonce, deadline },
    });
  const now = async () => (await pc.getBlock()).timestamp;
  const nonceOf = (a: Address) => pc.readContract({ address: dao.address, abi: miniDaoAbi, functionName: "nonces", args: [a] });

  console.log("== 1. direct member transaction: msg.sender is the member, the member pays");
  const b1 = await bal(acc[1]!);
  const r1 = await dao.send(acc[1]!, "vote", [id(1), 1]);
  log("receipt.from (tx sender = voter = payer)", r1.from === acc[1] ? "acct1" : r1.from);
  log("event", votes(r1).map((e: any) => ({ name: e.eventName, voter: e.args.voter, yes: e.args.yes, no: e.args.no })));
  log("acct1 paid (wei)", b1 - (await bal(acc[1]!)));

  console.log("\n== 2. relayed: acct2 signs, acct7 (not a member, no role) submits and pays");
  const dl = (await now()) + 3600n;
  const n2 = await nonceOf(acc[2]!);
  const sig = await sign(acc[2]!, 1n, 1, n2, dl);
  const args = [id(1), 1, n2, dl, sig];
  const [s2, rl] = [await bal(acc[2]!), await bal(relayer)];
  const simOk = await dao.sim(relayer, "voteBySig", args);
  log("relayer simulates first", simOk);
  const r2 = await dao.send(relayer, "voteBySig", args);
  log("receipt.from (the relayer)", r2.from === relayer ? "relayer acct7" : r2.from);
  log("VoteCast.voter (the signer)", votes(r2).map((e: any) => e.args.voter === acc[2] ? "acct2 (signer)" : e.args.voter));
  log("signer balance delta (wei)", (await bal(acc[2]!)) - s2);
  log("relayer paid (wei)", rl - (await bal(relayer)));
  log("signer nonce before -> after", [n2, await nonceOf(acc[2]!)]);

  console.log("\n== 3. refusals on the relayed path: what the relayer sees (raw revert, same decoder) ");
  log("replay same signature", (await dao.sim(relayer, "voteBySig", args)));
  const n2b = await nonceOf(acc[2]!);
  const again = await sign(acc[2]!, 1n, 0, n2b, dl);
  log("fresh signature, same member, same proposal (AlreadyVoted)", await dao.sim(relayer, "voteBySig", [id(1), 0, n2b, dl, again]));
  const expired = await sign(acc[3]!, 1n, 1, 0n, (await now()) - 10n);
  log("expired deadline", await dao.sim(relayer, "voteBySig", [id(1), 1, 0n, (await now()) - 10n, expired]));
  const outsider = await sign(acc[5]!, 1n, 1, 0n, dl);
  log("outsider (acct5, never added) signs", await dao.sim(relayer, "voteBySig", [id(1), 1, 0n, dl, outsider]));
  const s3 = await sign(acc[3]!, 1n, 1, 0n, dl);
  log("acct3 signed YES, relayer tampers the choice to NO -> recovers a random address", await dao.sim(relayer, "voteBySig", [id(1), 0, 0n, dl, s3]));
  log("garbage 65-byte signature", await dao.sim(relayer, "voteBySig", [id(1), 1, 0n, dl, ("0x" + "11".repeat(65)) as `0x${string}`]));
  log("wrong-length signature", await dao.sim(relayer, "voteBySig", [id(1), 1, 0n, dl, "0x1234"]));
  const wrongNonce = await sign(acc[3]!, 1n, 1, 5n, dl);
  log("future nonce 5 (signer is at 0)", await dao.sim(relayer, "voteBySig", [id(1), 1, 5n, dl, wrongNonce]));

  console.log("\n== 4. a reverting relayed tx sent anyway (no simulation): the relayer pays, the signer never learns");
  const [relB, sgB, nB, blkB] = [await bal(relayer), await bal(acc[3]!), await nonceOf(acc[3]!), await pc.getBlockNumber()];
  const bad = await dao.send(relayer, "voteBySig", [id(1), 0, 0n, dl, s3]); // tampered
  log("receipt", { status: bad.status, gasUsed: bad.gasUsed, logs: bad.logs.length, block: bad.blockNumber - blkB });
  log("relayer paid for a refusal (wei)", relB - (await bal(relayer)));
  log("signer balance delta / nonce delta", [(await bal(acc[3]!)) - sgB, (await nonceOf(acc[3]!)) - nB]);
  log("receipt carries a revert reason?", Object.keys(bad).filter((k) => /revert|reason/i.test(k)));

  console.log("\n== 5. two relayers race the same signature: both simulate OK, one lands, the other's tx is a mined revert");
  const dl5 = (await now()) + 3600n;
  const sig5 = await sign(acc[3]!, 2n, 1, 0n, dl5); const a5 = [id(2), 1, 0n, dl5, sig5];
  log("relayer A sim", (await dao.sim(relayer, "voteBySig", a5)).ok);
  log("relayer B sim", (await dao.sim(relayer2, "voteBySig", a5)).ok);
  const ra = await dao.send(relayer, "voteBySig", a5);
  const rb = await dao.send(relayer2, "voteBySig", a5);
  log("A receipt", { status: ra.status, events: votes(ra).length });
  log("B receipt", { status: rb.status, events: votes(rb).length });
  log("B's tx replayed as a call now says (the signer's intent already succeeded)", (await dao.sim(relayer2, "voteBySig", a5)));
  log("but acct3's vote on proposal 2 IS on chain", (await dao.get(id(2))).slice(1).map(String));
  log("so 'my tx hash succeeded' is the wrong test for confirmed; 'a VoteCast(proposal, voter=signer) log exists' is the right one", "");

  console.log("\n== 6. chain time and deadline: Anvil lets us move time");
  await rpc("evm_increaseTime", [7200]); await rpc("evm_mine");
  log("signature from step 5 (deadline +3600) after +7200s", await dao.sim(relayer, "voteBySig", a5));
} finally { anvil.stop(); }
