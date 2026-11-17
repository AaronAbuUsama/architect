// Named entry. Decode every public kernel field in the retained gossip payloads.
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import { PrivateKernelTailCircuitPublicInputs } from "@aztec/stdlib/kernel";
import { strict as assert } from "node:assert";
import { getContractClassFromArtifact } from "@aztec/stdlib/contract";
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { PrivateCoreContract } from "../generated/PrivateCore.js";

function plain(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value === null || typeof value !== "object") return value;
  if (Buffer.isBuffer(value)) return { bytes: value.length, hex: value.toString("hex") };
  if (Array.isArray(value)) return value.map(plain);
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)]));
}
const root = resolve(import.meta.dirname, "../../..");
const decoded: unknown[] = [];
for (const operation of ["deposit", "grant", "spend", "revoke"]) {
  const path = resolve(root, `evidence/public-${operation}.json.gz`);
  const snapshot = JSON.parse(gunzipSync(readFileSync(path)).toString()) as { gossip: { data: unknown }; nodeReturnedSameTx: boolean };
  assert.equal(snapshot.nodeReturnedSameTx, true);
  const serialized = snapshot.gossip.data;
  const buffer = typeof serialized === "string" ? Buffer.from(serialized.replace(/^0x/, ""), "hex")
    : Buffer.from(Object.values(serialized as Record<string, number>));
  const data = PrivateKernelTailCircuitPublicInputs.fromBuffer(buffer);
  decoded.push({ operation, fields: plain(data) });
}
writeFileSync(resolve(root, "evidence/public-decoded.json.gz"), gzipSync(JSON.stringify(decoded, null, 2) + "\n"));
const contractClass = await getContractClassFromArtifact(PrivateCoreContract.artifact);
const registered = await createAztecNodeClient("http://127.0.0.1:8080").getContractClass(contractClass.id);
assert.ok(registered, "generic class was published");
writeFileSync(resolve(root, "evidence/class-publication.json"), JSON.stringify(plain(registered), null, 2) + "\n");
console.log("PASS decoded all public kernel fields from node-returned transactions");
