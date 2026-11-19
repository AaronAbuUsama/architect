// Generated from the blueprint. Do not edit.
import type { McpEntry } from "@orthograph/language-effect";
import { declaration as handleClaim } from "../../api/src/handle/claim.ts";
import { declaration as handleRelease } from "../../api/src/handle/release.ts";
import { declaration as handleResolve } from "../../api/src/handle/resolve.ts";
import { declaration as linkAdd } from "../../api/src/link/add.ts";
import { declaration as linkOrder } from "../../api/src/link/order.ts";
import { declaration as linkRemove } from "../../api/src/link/remove.ts";
import { declaration as profileGet } from "../../api/src/profile/get.ts";

/** One tool per operation and read, named as the operation is. */
export const catalog = {
  "handle.claim": { description: "Claim a free name and make it the address of your public page, with its profile.", operation: handleClaim },
  "handle.release": { description: "Free your name and take its public page offline. Anyone may claim the name afterwards.", operation: handleRelease },
  "handle.resolve": { description: "Find the handle that holds a claimed name. A released or unclaimed name has none.", operation: handleResolve },
  "link.add": { description: "Append a link to your own public page. You need a claimed name first.", operation: linkAdd },
  "link.order": { description: "Move a link to a zero-based position. A position past the end puts it last.", operation: linkOrder },
  "link.remove": { description: "Remove a link from a public page.", operation: linkRemove },
  "profile.get": { description: "Read a claimed name's public page and its links in display order.", operation: profileGet },
} as const satisfies { readonly [name: string]: McpEntry };
