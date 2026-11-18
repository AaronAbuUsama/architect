import { Effect, Schema } from "effect";
import { defineAction } from "../src/modules/agent/service.ts";
import { ActionRefused } from "../src/modules/agent/types.ts";
import { workspacePages } from "../src/modules/workspace/service.ts";
import { workspaceNotes } from "../src/modules/workspace-notes/service.ts";

const pageSchema = Schema.Struct({
  key: Schema.String, title: Schema.String, group: Schema.String, path: Schema.String, kind: Schema.Literals(["thing", "operation"]),
});
const noteSchema = Schema.Struct({ markdown: Schema.String, revision: Schema.String, stale: Schema.Boolean });
const read = { errors: ["Unknown workspace page"], readOnly: true, retrySafe: true, needsApproval: false, agentTool: true, mcpTool: false } as const;

export const workspaceActions = (root: string) => {
  const notes = workspaceNotes(root);
  return {
    "list-pages": defineAction({
      ...read, description: "List thing and operation documents in the blueprint workspace.",
      schema: Schema.Struct({}), outputSchema: Schema.Struct({ pages: Schema.Array(pageSchema) }),
      run: (_, { blueprint }) => Effect.succeed({ pages: workspacePages(blueprint) }),
    }),
    "read-page": defineAction({
      ...read, description: "Read generated reference and author-maintained notes for one workspace page.",
      schema: Schema.Struct({ key: Schema.String }), outputSchema: Schema.Struct({ page: pageSchema, reference: Schema.String, notes: noteSchema }),
      run: ({ key }, { blueprint }) => Effect.gen(function* () {
        const page = workspacePages(blueprint).find((item) => item.key === key);
        if (!page) return yield* new ActionRefused({ status: 404, message: "Unknown workspace page." });
        return { page, reference: blueprint.docs[page.key]!, notes: yield* notes.read(page) };
      }),
    }),
    "save-page-notes": defineAction({
      ...read, description: "Save Markdown notes beside the selected declaration.",
      readOnly: false, retrySafe: false, agentTool: false,
      schema: Schema.Struct({ key: Schema.String, revision: Schema.String, markdown: Schema.String }),
      outputSchema: noteSchema,
      run: ({ key, revision, markdown }, { blueprint }) => Effect.gen(function* () {
        const page = workspacePages(blueprint).find((item) => item.key === key);
        if (!page) return yield* new ActionRefused({ status: 404, message: "Unknown workspace page." });
        if (markdown.length > 80_000) return yield* new ActionRefused({ status: 413, message: "The page notes exceed 80,000 characters." });
        return yield* notes.save(page, revision, markdown);
      }),
    }),
  };
};
