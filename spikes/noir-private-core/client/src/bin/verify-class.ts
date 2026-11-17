// Named entry: bind the retained network record to the current compiled core.
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getContractClassFromArtifact } from "@aztec/stdlib/contract";
import { PrivateCoreContract } from "../generated/PrivateCore.js";
const recorded = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../../evidence/class-publication.json"), "utf8")) as { id: { asBigInt: string } };
const actual = await getContractClassFromArtifact(PrivateCoreContract.artifact);
assert.equal(actual.id.toBigInt(), BigInt(recorded.id.asBigInt));
console.log("PASS current compiled core matches the retained published class");
