import type { JWTPayload } from "jose";
import type { Claims, TokenPolicy } from "../types.ts";

const escape = (s: string) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

/** `*` is exactly one path segment, so a pull request's `refs/pull/<star>/merge` matches `refs/pull/7/merge` and nothing longer. */
export const matches = (pattern: string, value: string): boolean =>
  new RegExp(`^${pattern.split("*").map(escape).join("[^/]+")}$`).test(value);

const anyMatches = (patterns: ReadonlyArray<string>, value: string) => patterns.some((p) => matches(p, value));

export const list = (value: unknown): ReadonlyArray<string> =>
  typeof value === "string" ? value.split(",").map((s) => s.trim()).filter((s) => s !== "") : [];

const text = (payload: JWTPayload, key: string): string | null => {
  const value = payload[key];
  return typeof value === "string" && value !== "" ? value : null;
};

/** `<repo>/.github/workflows/<file>@<ref>`, taken apart. */
const parseJobWorkflowRef = (value: string) => /^([^/]+\/[^/]+)\/(\.github\/workflows\/[^@]+)@(.+)$/.exec(value);

/**
 * The policy after the signature: repository, ref and workflow, and `job_workflow_ref` when the token has one (two
 * workflows can share a name; a file path cannot). Returns the claims worth keeping, or the name of the check that failed.
 */
export const check = (policy: TokenPolicy, payload: JWTPayload): Claims | string => {
  const repository = text(payload, "repository");
  const ref = text(payload, "ref");
  const workflow = text(payload, "workflow");
  if (repository === null || repository !== policy.repository) return "repository";
  if (ref === null || !anyMatches(policy.refs, ref)) return "ref";
  const jobWorkflowRef = text(payload, "job_workflow_ref");
  const job = jobWorkflowRef === null ? null : parseJobWorkflowRef(jobWorkflowRef);
  if (jobWorkflowRef !== null && (job === null || job[1] !== policy.repository || !anyMatches(policy.refs, job[3]!))) return "job_workflow_ref";
  const named = workflow !== null && policy.workflows.some((w) => !w.includes("/") && matches(w, workflow));
  const pinned = job !== null && policy.workflows.some((w) => w.includes("/") && matches(w, job[2]!));
  if (!named && !pinned) return "workflow";
  return { repository, ref, workflow: workflow ?? "", eventName: text(payload, "event_name"), sha: text(payload, "sha"), jobWorkflowRef };
};
