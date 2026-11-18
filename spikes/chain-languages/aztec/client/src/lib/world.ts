// Spike helpers: one wallet (own PXE) per actor, sponsored fees, a prove step split from the send step.
// Secrets live in memory only (ephemeral stores); nothing here prints or writes a key.
import { EmbeddedWallet } from "@aztec/wallets/embedded";
import { createAztecNodeClient, waitForNode, type AztecNode } from "@aztec/aztec.js/node";
import { getContractInstanceFromInstantiationParams } from "@aztec/aztec.js/contracts";
import { Fr, GrumpkinScalar } from "@aztec/aztec.js/fields";
import { SponsoredFeePaymentMethod } from "@aztec/aztec.js/fee";
import { SponsoredFPCContract } from "@aztec/noir-contracts.js/SponsoredFPC";
import { SPONSORED_FPC_SALT } from "@aztec/constants";
import type { AztecAddress } from "@aztec/aztec.js/addresses";
import type { ExecutionPayload } from "@aztec/stdlib/tx";
import { GovernanceContract } from "../generated/Governance.js";

export const NODE_URL = "http://127.0.0.1:8080";

/** Exposes the SDK's protected prove seam, as the noir-private-core spike did. */
export class Device extends EmbeddedWallet {
  get pxeEngine() { return this.pxe; }
  async prove(payload: ExecutionPayload, from: AztecAddress, additionalScopes: AztecAddress[] = []) {
    const fee = await this.completeFeeOptions({ from, feePayer: payload.feePayer });
    const request = await this.createTxExecutionRequestFromPayloadAndFee(payload, from, fee);
    return this.pxe.proveTx(request, { scopes: this.scopesFrom(from, additionalScopes, undefined), senderForTags: this.senderForTagsFrom(from, undefined) });
  }
}

export interface Actor { readonly wallet: Device; readonly address: AztecAddress; }
export interface World { readonly node: AztecNode; readonly sponsor: AztecAddress; readonly fee: { paymentMethod: SponsoredFeePaymentMethod }; readonly fpc: Awaited<ReturnType<typeof sponsorInstance>>; }

const sponsorInstance = () => getContractInstanceFromInstantiationParams(SponsoredFPCContract.artifact, { salt: new Fr(SPONSORED_FPC_SALT) });

export async function connect(): Promise<World> {
  const node = createAztecNodeClient(NODE_URL);
  await waitForNode(node);
  const fpc = await sponsorInstance();
  return { node, sponsor: fpc.address, fee: { paymentMethod: new SponsoredFeePaymentMethod(fpc.address) }, fpc };
}

/** A fresh account (initializerless Schnorr: no deployment tx) in its own ephemeral PXE. */
export interface Keys { secret: Fr; salt: Fr; signing: GrumpkinScalar }
export const randomKeys = (): Keys => ({ secret: Fr.random(), salt: Fr.random(), signing: GrumpkinScalar.random() });
export async function newActor(w: World, proverEnabled = true, keys: Keys = randomKeys()): Promise<Actor> {
  const wallet = await Device.create(w.node, { ephemeral: true, pxe: { proverEnabled } });
  await wallet.registerContract(w.fpc, SponsoredFPCContract.artifact);
  const account = await wallet.createSchnorrInitializerlessAccount(keys.secret, keys.salt, keys.signing);
  return { wallet, address: account.address };
}

/** Everyone learns everyone as a possible note sender (note discovery is tagged by sender). */
export async function introduce(actors: Actor[]) {
  for (const a of actors) for (const b of actors) if (a !== b) await a.wallet.registerSender(b.address, "peer");
}

export async function deployGovernance(w: World, admin: Actor) {
  const { contract, instance } = await GovernanceContract.deploy(admin.wallet, admin.address).send({ from: admin.address, fee: w.fee });
  return { address: contract.address, instance };
}

export async function register(a: Actor, instance: Parameters<Device["registerContract"]>[0]) {
  await a.wallet.registerContract(instance, GovernanceContract.artifact);
}

export const gov = (a: Actor, at: AztecAddress) => GovernanceContract.at(at, a.wallet);
export const now = () => performance.now();

import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
export const evidencePath = (name: string) => resolve(import.meta.dirname, "../../../evidence", name);
export const save = (name: string, value: unknown) =>
  writeFileSync(evidencePath(name), JSON.stringify(value, (_, v: unknown) => (typeof v === "bigint" ? v.toString() : v), 2) + "\n");
