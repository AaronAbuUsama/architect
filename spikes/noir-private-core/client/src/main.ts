// Named entry: fresh local wallets, real proofs, real token, adversarial checks.
import { Effect, Layer } from "effect";
import { strict as assert } from "node:assert";
import { writeFileSync, mkdirSync } from "node:fs";
import { Writable } from "node:stream";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";
import { createAztecNodeClient, waitForNode } from "@aztec/aztec.js/node";
import { createAztecNodeAdminClient } from "@aztec/stdlib/interfaces/client";
import { getContractInstanceFromInstantiationParams } from "@aztec/aztec.js/contracts";
import { publishContractClass } from "@aztec/aztec.js/deployment";
import { deriveKeys } from "@aztec/aztec.js/keys";
import { Fr, GrumpkinScalar } from "@aztec/aztec.js/fields";
import { SponsoredFeePaymentMethod } from "@aztec/aztec.js/fee";
import { getFeeJuiceBalance } from "@aztec/aztec.js/utils";
import { SponsoredFPCContract } from "@aztec/noir-contracts.js/SponsoredFPC";
import { TokenContract } from "@aztec/noir-contracts.js/Token";
import { SPONSORED_FPC_SALT } from "@aztec/constants";
import { overwriteLoggingStream } from "@aztec/foundation/log";
import { EthCheatCodes } from "@aztec/ethereum/test";
import { TestDateProvider } from "@aztec/foundation/timer";
import { PrivateCoreContract } from "./generated/PrivateCore.js";
import { ClockProbeContract } from "./generated/ClockProbe.js";
import { DeviceWallet, live } from "./modules/client/service.js";
import { Client, Device, type Interaction, type Committed } from "./modules/client/types.js";
import { failureCategory, makeMonitor } from "./modules/telemetry/service.js";
import { races, clock } from "./modules/probes/service.js";
import type { Harness, Person } from "./modules/probes/types.js";

const root = resolve(import.meta.dirname, "../..");
const monitor = makeMonitor();
for (const value of [1000000n, 200000n, 600000n, 595679n, 10000n, 7000n, 3000n, 900000n, 4321n, 5679n, 101n, 102n, 103n, 104n, 113n, 211n, 307n]) monitor.watch(value);
overwriteLoggingStream(new Writable({ write(chunk, _encoding, done) { monitor.log(String(chunk)); done(); } }));
const json = (value: unknown) => JSON.stringify(value, (_, v: unknown) => typeof v === "bigint" ? v.toString() : v, 2);
const save = (name: string, value: unknown) => name.startsWith("public-") && name !== "public-view.json"
  ? writeFileSync(resolve(root, "evidence", name + ".gz"), gzipSync(json(value) + "\n"))
  : writeFileSync(resolve(root, "evidence", name), json(value) + "\n");
const call = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect.pipe(Effect.withTracer(monitor.tracer)));
const wallets: DeviceWallet[] = [];
const samples: { operation: string; provingMs: number; proveMs: number; totalMs: number }[] = [];
let phase = "connect";
function containsLeaf(value: unknown, needle: string): boolean {
  if (value !== null && typeof value === "object") return Object.values(value).some((v) => containsLeaf(v, needle));
  return String(value) === needle;
}
function watchKeys(value: unknown): void {
  if (typeof value === "bigint" || typeof value === "string") monitor.watch(value);
  else if (value !== null && typeof value === "object") for (const v of Object.values(value)) watchKeys(v);
}

async function main() {
  mkdirSync(resolve(root, "evidence"), { recursive: true });
  const node = createAztecNodeClient("http://127.0.0.1:8080");
  await waitForNode(node);
  const fpc = await getContractInstanceFromInstantiationParams(SponsoredFPCContract.artifact, { salt: new Fr(SPONSORED_FPC_SALT) });
  const sponsor = fpc.address;
  const fee = { paymentMethod: new SponsoredFeePaymentMethod(sponsor) };
  async function person(prove = true): Promise<Person> {
    const wallet = await DeviceWallet.create(node, { ephemeral: true, pxe: { proverEnabled: prove } });
    wallets.push(wallet);
    await wallet.registerContract(fpc, SponsoredFPCContract.artifact);
    const secret = Fr.random(), signing = GrumpkinScalar.random(), salt = Fr.random();
    monitor.watch(secret.toString()); monitor.watch(signing.toString()); monitor.watch(salt.toString());
    watchKeys(await deriveKeys(secret));
    const account = await wallet.createSchnorrInitializerlessAccount(secret, salt, signing);
    monitor.watch(account.address.toString());
    return { wallet, address: account.address };
  }
  phase = "wallets";
  const admin = await person(), member = await person(), member2 = await person(), nonmember = await person();
  const recipient = await person(), race1 = await person(), race2 = await person(), issuer = await person(), filler = await person(false);
  const people = [admin, member, member2, nonmember, recipient, race1, race2, issuer, filler];
  for (const a of people) for (const b of people) if (a !== b) await a.wallet.registerSender(b.address, "peer");
  phase = "token";
  const { contract: token } = await TokenContract.deploy(issuer.wallet, issuer.address, "PrivateCoreAsset", "PCA", 18).send({ from: issuer.address, fee });
  const tokenInstance = (await issuer.wallet.getContractMetadata(token.address)).instance!;
  for (const p of people) await p.wallet.registerContract(tokenInstance, TokenContract.artifact);
  monitor.watch(token.address.toString());
  const secret = Fr.random(), poolSalt = Fr.random(); monitor.watch(secret.toString()); monitor.watch(poolSalt.toString());
  const poolKeys = await deriveKeys(secret); watchKeys(poolKeys);
  const instance = await getContractInstanceFromInstantiationParams(PrivateCoreContract.artifact, {
    salt: poolSalt, publicKeys: poolKeys.publicKeys,
    constructorArgs: [admin.address, token.address], deployer: admin.address,
  });
  const pool = instance.address; monitor.watch(pool.toString());
  for (const p of people) {
    await p.wallet.registerContract(instance, PrivateCoreContract.artifact, p === recipient || p === issuer ? undefined : secret);
    await p.wallet.registerSender(pool, "organisation");
  }
  const core = (p: Person) => PrivateCoreContract.at(pool, p.wallet);
  const context = (p: Person) => live.pipe(Layer.provide(Layer.succeed(Device, { wallet: p.wallet, from: p.address, pool, node, sponsor })));
  const run = (p: Person, name: string, interaction: Interaction) => Effect.gen(function* () {
    const client = yield* Client;
    const result = yield* client.run(name, interaction);
    samples.push({ operation: name, ...result.timings });
    writeFileSync(resolve(root, "runtime/progress.json"), json({ phase, completedOperations: samples.length, lastOperation: name }));
    return result;
  }).pipe(Effect.provide(context(p)));
  const prove = (p: Person, name: string, interaction: Interaction) => Effect.gen(function* () {
    return yield* (yield* Client).prove(name, interaction);
  }).pipe(Effect.provide(context(p)));
  async function refusal(p: Person, name: string, interaction: Interaction, expected: string) {
    const result = await call(Effect.result(run(p, name, interaction)));
    assert.equal(result._tag, "Failure", name);
    assert.ok(result._tag === "Failure");
    assert.equal(result.failure._tag, expected, name);
    return { tag: result.failure._tag, ...("remaining" in result.failure ? { remaining: result.failure.remaining } : {}) };
  }
  const read = (p: Person) => Effect.promise(() => p.wallet.engine.sync()).pipe(Effect.andThen(
    Effect.promise(() => core(p).methods.read_right(p.address).simulate({ from: p.address, additionalScopes: [pool] })),
  ), Effect.map((r) => r.result as [boolean, bigint, bigint, bigint]), Effect.tap((r) => Effect.sync(() => { for (const n of r.slice(1)) if (typeof n === "bigint") monitor.watch(n); })));
  const balance = async (p: Person, owner = pool) => { await p.wallet.engine.sync(); const amount = (await TokenContract.at(token.address, p.wallet).methods.balance_of_private(owner).simulate({ from: p.address, additionalScopes: owner.equals(pool) ? [pool] : [] })).result as bigint; monitor.watch(amount); return amount; };
  phase = "private-initialization";
  await call(run(admin, "publishClass", await publishContractClass(admin.wallet, PrivateCoreContract.artifact)));
  assert.ok(await node.getContractClass(instance.currentContractClassId));
  assert.equal(await node.getContract(pool), undefined);
  await call(run(admin, "initialize", core(admin).methods.constructor(admin.address, token.address)));
  const unpublishedBefore = (await node.getContract(pool)) === undefined;
  phase = "deposit";
  await TokenContract.at(token.address, issuer.wallet).methods.mint_to_private(admin.address, 1000000n).send({ from: issuer.address, fee });
  monitor.watch(1000000n);
  const deposits: Committed[] = [];
  for (let i = 0; i < 3; i++) deposits.push(await call(run(admin, "deposit", TokenContract.at(token.address, admin.wallet).methods.transfer_in_private(admin.address, pool, 200000n, 0))));
  assert.equal(await balance(admin), 600000n);
  assert.equal(await balance(member), 600000n);
  phase = "rights";
  const grant = await call(run(admin, "grant", core(admin).methods.grant(member.address, 10000n)));
  await call(run(admin, "grant", core(admin).methods.grant(member2.address, 7000n)));
  const spend = await call(run(member, "spend", core(member).methods.spend(recipient.address, 4321n)));
  monitor.watch(4321n); monitor.watch(5679n); monitor.watch(595679n);
  assert.equal(await balance(recipient, recipient.address), 4321n);
  assert.equal(await balance(member), 595679n);
  const outsideRead = await core(recipient).methods.read_right(member.address).simulate({ from: recipient.address, additionalScopes: [pool] }).then(() => false, () => true);
  assert.equal(outsideRead, true, "outside wallet without shared key cannot read rights");
  assert.equal((await call(read(member)))[2], 4321n);
  const exceeded = await refusal(member, "spend", core(member).methods.spend(recipient.address, 10000n), "AllowanceExceeded");
  assert.equal("remaining" in exceeded ? exceeded.remaining : undefined, 5679n);
  const outsider = await refusal(nonmember, "spend", core(nonmember).methods.spend(recipient.address, 1n), "AllowanceNotMember");
  await refusal(admin, "spend", core(admin).methods.spend(recipient.address, 1n), "AllowanceNotMember");
  const authority = await refusal(member, "grant", core(member).methods.grant(nonmember.address, 900000n), "AllowanceNotAdmin");
  await refusal(member, "revoke", core(member).methods.revoke(member2.address), "AllowanceNotAdmin");
  const bypass = await call(Effect.result(run(member, "directTokenBypass", TokenContract.at(token.address, member.wallet).methods.transfer_in_private(pool, recipient.address, 101n, 0))));
  assert.equal(bypass._tag, "Failure", "shared note key cannot bypass token caller authority");
  assert.equal((await call(read(member)))[2], 4321n, "refusals leave budget unchanged");
  assert.equal(await balance(member), 595679n, "refusals leave token balance unchanged");
  for (let i = 0; i < 4; i++) await call(run(member2, "spend", core(member2).methods.spend(recipient.address, BigInt(101 + i))));
  assert.deepEqual((await call(read(member2))).slice(1, 3), [7000n, 410n]);
  assert.deepEqual((await call(read(member))).slice(1, 3), [10000n, 4321n], "other member keeps their own budget");
  assert.equal(await balance(recipient, recipient.address), 4731n);
  assert.equal(await balance(member2), 595269n);
  phase = "stale-spend";
  const held = await call(prove(member, "spend", core(member).methods.spend(recipient.address, 113n)));
  const revoke = await call(run(admin, "revoke", core(admin).methods.revoke(member.address)));
  const late = await call(Effect.result(held.submit));
  assert.ok(late._tag === "Failure");
  assert.equal(late.failure._tag, "NetworkRejected");
  assert.ok("reason" in late.failure && late.failure.reason === "Existing nullifier");
  const revoked = await refusal(member, "spend", core(member).methods.spend(recipient.address, 1n), "AllowanceNotMember");
  assert.equal((await call(read(member)))[0], false, "revoked holder still reads the tombstone");
  await call(run(admin, "grant", core(admin).methods.grant(nonmember.address, 3000n)));
  await call(run(admin, "revoke", core(admin).methods.revoke(nonmember.address)));
  save("checks.json", { unpublishedBefore, realPrivateToken: true, separateBudgetsAndTokenConservation: true, refusalsDoNotMoveStateOrTokens: true, sharedKeyAdminRevoke: true, revokedReadRetained: true, outsideReadRefused: outsideRead, directTokenBypassRefused: bypass._tag === "Failure", exceeded, outsider, authority, revoked, staleSpend: { tag: late.failure._tag, reason: "Existing nullifier" } });
  phase = "public-view";
  const views: unknown[] = [];
  const values = [pool, token.address, ...people.map((p) => p.address)].map((a) => a.toString().slice(2));
  for (const [operation, tx] of [["deposit", deposits[0]], ["grant", grant], ["spend", spend], ["revoke", revoke]] as const) {
    const receipt = await node.getTxReceipt(tx.tx.getTxHash(), { includeTxEffect: true });
    assert.ok("txEffect" in receipt && receipt.txEffect);
    const effects = receipt.txEffect;
    const returned = await node.getTxByHash(tx.tx.getTxHash(), { includeProof: true });
    assert.ok(returned && returned.toBuffer().equals(tx.tx.toBuffer()), "node returns the exact submitted gossip transaction including proof");
    const bytes = tx.tx.toBuffer().toString("hex");
    const publicText = json({ effects, gossip: tx.tx }).toLowerCase() + bytes;
    assert.equal(values.some((a) => publicText.includes(a)), false);
    assert.ok(tx.tx.data.feePayer.equals(sponsor));
    const amounts = operation === "deposit" ? [200000n] : operation === "grant" ? [10000n] : operation === "spend" ? [4321n] : [];
    const leafValues = JSON.parse(json({ effects, gossip: returned })) as unknown;
    assert.equal(amounts.some((n) => publicText.includes(n.toString(16).padStart(64, "0")) || containsLeaf(leafValues, n.toString())), false, "private amount absent from public values and bytes");
    save(`public-${operation}.json`, { effects, gossip: returned, submittedBytes: bytes, nodeReturnedSameTx: true });
    views.push({ operation, feePayer: sponsor.toString(), lifetimeSeconds: tx.expires - tx.anchor, noteHashes: effects.noteHashes.length, nullifiers: effects.nullifiers.length, privateLogs: effects.privateLogs.length, publicLogs: effects.publicLogs.length, publicDataWrites: effects.publicDataWrites.length, l2ToL1Msgs: effects.l2ToL1Msgs.length, classLogs: effects.contractClassLogs.length, publicCalls: tx.tx.data.numberOfPublicCallRequests(), transactionFee: effects.transactionFee.toString(), privateAddressesFound: false, privateAmountsFound: false, gossipFields: Object.keys(tx.tx), kernelFields: Object.keys(tx.tx.data), nodeReturnedSameTx: true });
  }
  save("public-view.json", views);
  phase = "probes";
  const probe = await getContractInstanceFromInstantiationParams(ClockProbeContract.artifact, { salt: Fr.random() });
  await filler.wallet.registerContract(probe, ClockProbeContract.artifact);
  await admin.wallet.registerContract(probe, ClockProbeContract.artifact);
  const tick = () => run(filler, "ordinary", ClockProbeContract.at(probe.address, filler.wallet).methods.tick(Fr.random()));
  const ordinary = () => run(admin, "ordinary", ClockProbeContract.at(probe.address, admin.wallet).methods.tick(Fr.random()));
  const h: Harness = { node, api: createAztecNodeAdminClient("http://127.0.0.1:8880"), eth: new EthCheatCodes(["http://127.0.0.1:8545"], new TestDateProvider()), pool, admin, member: member2, recipient, raceMembers: [race1, race2], core, run, prove, read, tick, ordinary, wait: (ms) => Effect.promise(() => new Promise<void>((r) => setTimeout(r, ms))).pipe(Effect.withSpan("timer")) };
  save("races.json", await call(races(h)));
  const current = Number((await node.getBlockData("latest"))!.header.globalVariables.timestamp);
  const date = new Date(current * 1000);
  const nextMonth = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) / 1000;
  const { boundaryTransaction, ...clockResult } = await call(clock(h, nextMonth));
  save("clock.json", clockResult); save("public-month-boundary.json", boundaryTransaction);
  assert.equal(await node.getContract(pool), undefined);
  const feeBalances = await Promise.all(people.map((p) => getFeeJuiceBalance(p.address, node)));
  assert.ok(feeBalances.every((b) => b === 0n));
  assert.ok(samples.filter((s) => s.operation !== "ordinary").every((s) => s.provingMs > 0), "non-control operations made real client proofs");
  save("measurements.json", { platform: process.platform, arch: process.arch, realClientProofs: true, networkVerifiesProofs: false, samples, partiesWithFeeJuice: feeBalances.filter((b) => b > 0n).length, organisationPubliclyDeployed: false });
  const report = monitor.report();
  save("spans.json", report.spans); save("library-logs.json", report.logs);
  save("telemetry.json", { spans: report.spans.length, logs: report.logs.length, tracked: report.tracked, spanLeaks: report.spanLeaks, rawLibraryLogLeaks: report.rawLibraryLogLeaks, recordedLibraryLogLeaks: report.recordedLibraryLogLeaks });
  assert.equal(report.spanLeaks, 0); assert.equal(report.recordedLibraryLogLeaks, 0);
  console.log("PASS private token, roles, budgets, stale revoke, races, month boundary, public view, fee balances and telemetry");
}

try { await main(); } catch (error) {
  console.error("FAILED", { phase, category: failureCategory(error) });
  process.exitCode = 1;
} finally { for (const wallet of wallets) await wallet.stop(); }
