import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { Effect } from "effect";
import type { WorkspacePage } from "../workspace/types.ts";
import { workspaceNotes } from "./service.ts";

test("author notes save beside its declaration, flag stale hashes and refuse an old revision", (context) => {
  const root = mkdtempSync(join(tmpdir(), "portal-notes-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "document", "verbs"), { recursive: true });
  const page: WorkspacePage = {
    key: "document/get.md", title: "Get", group: "document", path: "/workspace/document/get",
    kind: "operation", name: "document.get", hash: "abc123", noteFile: "document/verbs/get.md",
  };
  const store = workspaceNotes(root);
  const initial = Effect.runSync(store.read(page));
  assert.equal(initial.markdown, "");
  const saved = Effect.runSync(store.save(page, initial.revision, "A **rich** note."));
  assert.equal(saved.markdown, "A **rich** note.");
  assert.match(readFileSync(join(root, page.noteFile), "utf8"), /about: operation:document\.get@abc123/u);
  assert.equal(Effect.runSync(store.read({ ...page, hash: "abc456" })).stale, true);
  assert.equal(Effect.runSync(Effect.result(store.save(page, initial.revision, "Lost edit")))._tag, "Failure");
  assert.equal(Effect.runSync(store.read(page)).markdown, saved.markdown);
});
