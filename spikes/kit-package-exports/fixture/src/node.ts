// Actual Node builtin import: this must never enter Worker or browser closures.
import { createHash } from "node:crypto";

export const fingerprint = (text: string) => createHash("sha256").update(text).digest("hex");
