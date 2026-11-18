// Generated from the blueprint. Do not edit.
import { HttpApi, HttpApiGroup } from "effect/http-api";
import * as sheetClose from "./sheet/close.ts";
import * as sheetGet from "./sheet/get.ts";
import * as sheetJoin from "./sheet/join.ts";
import * as sheetOpen from "./sheet/open.ts";

export class Sheet extends HttpApiGroup.make("sheet").add(sheetClose.endpoint).add(sheetGet.endpoint).add(sheetJoin.endpoint).add(sheetOpen.endpoint) {}
export class Api extends HttpApi.make("signup").add(Sheet) {}

export * as Errors from "./errors.ts";
export * as Events from "./events.ts";
export const operations = { "sheet.close": sheetClose, "sheet.get": sheetGet, "sheet.join": sheetJoin, "sheet.open": sheetOpen } as const;
