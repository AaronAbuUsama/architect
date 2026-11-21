import { Blueprint } from "orthograph";

/** An amount of a token, in that token's base units: no decimals in the value (M6-chain item 2). A bigint in Effect, a uint128 in Solidity. */
export const Amount = Blueprint.value(Blueprint.uint(128));
