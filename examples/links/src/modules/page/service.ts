import { find, handleId, profileId, signedInPerson } from "./internal/records.ts";
import type { PageRecordsApi } from "./types.ts";

export const PageRecords: PageRecordsApi = { find, handleId, profileId, signedInPerson };
