// Adapted from @prb/effect-evm@5.0.3 src/core/errors/{viem-mapper,tx}.ts. See LICENSE-prb-effect-evm.
import {
  BlockNotFoundError, HttpRequestError, InsufficientFundsError, NonceTooLowError,
  TimeoutError, TransactionNotFoundError, TransactionReceiptNotFoundError,
  UserRejectedRequestError,
} from "viem";
import type { FaultKind } from "../types.ts";

const NONCE_TOO_LOW = /nonce (?:is )?too low|nonce has already been used|already used nonce/iu;
const NONCE_FALSE_POSITIVE = /nonce too high|transaction underpriced|already known/iu;
const FUNDS = /insufficient (?:funds|balance)|exceeds balance|outoffunds/iu;
const RESOURCE = /cannot allocate memory|ENOMEM|out of memory/iu;
const TRANSIENT = /rate limit|too many requests|timed? ?out|temporarily unavailable|ECONNRESET|ECONNREFUSED|fetch failed|socket hang up/iu;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function* errorChain(error: unknown): Iterable<unknown> {
  const pending = [error];
  const seen = new WeakSet<object>();
  for (const value of pending) {
    if (!isRecord(value)) {
      yield value;
      continue;
    }
    if (seen.has(value)) continue;
    seen.add(value);
    yield value;
    if (value["cause"] !== undefined) pending.push(value["cause"]);
    if (value["error"] !== undefined) pending.push(value["error"]);
  }
}

export const errorMessages = (value: unknown): ReadonlyArray<string> => {
  if (typeof value === "string") return [value];
  if (!isRecord(value)) return [];
  return [value["message"], value["shortMessage"], value["details"]].filter(
    (field): field is string => typeof field === "string",
  );
};

export const hasMessage = (error: unknown, pattern: RegExp): boolean =>
  Array.from(errorChain(error)).some((cause) => errorMessages(cause).some((message) => pattern.test(message)));

export const rpcFaultKind = (error: unknown): FaultKind => {
  const causes = Array.from(errorChain(error));
  if (causes.some((cause) => cause instanceof UserRejectedRequestError ||
    (isRecord(cause) && cause["code"] === 4001))) return "rejected";
  if (causes.some((cause) => cause instanceof NonceTooLowError) ||
    (hasMessage(error, NONCE_TOO_LOW) && !hasMessage(error, NONCE_FALSE_POSITIVE))) return "nonce";
  if (causes.some((cause) => cause instanceof InsufficientFundsError) || hasMessage(error, FUNDS)) return "funds";
  if (hasMessage(error, RESOURCE)) return "resource";
  if (causes.some((cause) => cause instanceof TimeoutError)) return "timeout";
  return "transport";
};

export const isPendingReceipt = (error: unknown): boolean =>
  Array.from(errorChain(error)).some((cause) =>
    cause instanceof TransactionNotFoundError || cause instanceof TransactionReceiptNotFoundError);

export const isMissingBlock = (error: unknown): boolean =>
  Array.from(errorChain(error)).some((cause) => cause instanceof BlockNotFoundError);

export const isTransient = (error: unknown): boolean =>
  Array.from(errorChain(error)).some((cause) =>
    cause instanceof TimeoutError ||
    (cause instanceof HttpRequestError && (cause.status === 429 || (cause.status ?? 0) >= 500)) ||
    (isRecord(cause) && cause["code"] === -32005)) || hasMessage(error, TRANSIENT);
