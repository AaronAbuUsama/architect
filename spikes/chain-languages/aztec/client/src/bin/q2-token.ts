// Q2: the stock Token, deployed by someone else, read through an adapter typed from its artifact.
import { TokenContract } from "@aztec/noir-contracts.js/Token";
import { getPublicEvents } from "@aztec/aztec.js/events";
import { NO_FROM } from "@aztec/aztec.js/account";
import { connect, newActor, introduce, now, save } from "../lib/world.js";

const w = await connect();
const [issuer, alice, reader] = [await newActor(w), await newActor(w), await newActor(w)];
await introduce([issuer, alice, reader]);
const t0 = now();
const { contract: token, instance } = await TokenContract.deploy(issuer.wallet, issuer.address, "DaoShare", "SHR", 0).send({ from: issuer.address, fee: w.fee });
await alice.wallet.registerContract(instance, TokenContract.artifact); // every PXE that touches the token must be told its class
const tokenAt = (a: typeof issuer) => TokenContract.at(token.address, a.wallet);
await tokenAt(issuer).methods.mint_to_public(alice.address, 100n).send({ from: issuer.address, fee: w.fee });
await tokenAt(issuer).methods.mint_to_private(alice.address, 40n).send({ from: issuer.address, fee: w.fee });
await tokenAt(alice).methods.transfer_in_public(alice.address, issuer.address, 5n, 0n).send({ from: alice.address, fee: w.fee });
console.log("token ready ms", Math.round(now() - t0));

// The adapter: nothing but the artifact, the address and the instance (the outsider's PXE must be told both).
await reader.wallet.registerContract(instance, TokenContract.artifact);
const ro = tokenAt(reader);
const read = async <T>(call: { simulate: (o: any) => Promise<{ result: T }> }) => (await call.simulate({ from: NO_FROM })).result;
const out: Record<string, unknown> = {};
out.publicBalanceAlice = await read(ro.methods.balance_of_public(alice.address));
out.publicBalanceIssuer = await read(ro.methods.balance_of_public(issuer.address));
out.totalSupply = await read(ro.methods.total_supply());
out.admin = String(await read(ro.methods.get_admin()));
// What an outside reader cannot see: Alice's private notes (40 units were minted to her privately).
await reader.wallet.pxeEngine.sync();
out.privateBalanceAliceAsReader = await (ro.methods.balance_of_private(alice.address)).simulate({ from: reader.address }).then((r) => r.result, (e) => `ERROR ${String(e.message).slice(0, 160)}`);
await alice.wallet.pxeEngine.sync();
out.privateBalanceAliceAsAlice = (await tokenAt(alice).methods.balance_of_private(alice.address).simulate({ from: alice.address })).result;
out.privateBalanceAliceAsIssuerPxe = (await tokenAt(issuer).methods.balance_of_private(alice.address).simulate({ from: issuer.address })).result;
// Events: the token emits Transfer only from private transfer (delivered to the recipient), not from public ones.
try {
  const ev = await getPublicEvents(w.node, TokenContract.events.Transfer, { contractAddress: token.address, fromBlock: 1 as never });
  out.publicTransferEventsSeenByOutsider = ev.events.length;
} catch (e) { out.publicTransferEventsSeenByOutsider = `ERROR ${String((e as Error).message).slice(0, 160)}`; }
// Typed errors from someone else's contract: a refused call comes back as a plain Error whose message is the contract's own string.
out.refusalFromTokenAsSeen = await tokenAt(alice).methods.transfer_in_public(alice.address, issuer.address, 100000n, 0n).simulate({ from: alice.address }).then(() => "no error", (e: Error) => ({ name: e.constructor.name, message: e.message.split("\n")[0].slice(0, 200) }));
save("q2-token.json", out);
console.log(JSON.stringify(out, (_, v) => typeof v === "bigint" ? String(v) : v, 2));
process.exit(0);
