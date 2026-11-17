// The static search index, written to a file at build time; the search dialog fetches it once and searches in the browser.
import { createFromSource } from "fumadocs-core/search/server";
import { source } from "../blueprint/source.ts";

const search = createFromSource(source);
export const loader = () => search.staticGET();
