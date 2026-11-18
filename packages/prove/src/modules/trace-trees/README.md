# trace-trees

`TraceTrees.render(id, trace)`: a `Trace` as lines of text, one span per line with its duration, indented under its
parent in start order, each log under the span that wrote it. This is what `ortho telemetry trace <id>` prints; it
reads a value, so it is the same for the files today and for Axiom later (O1's `TraceSource`).

The conventions show in words: a declared refusal is `refused <Tag>` and nothing red (its span ended ok); a defect is
`✘ defect: <first line>`; any other failed span is `✘ error`. A step span shows its `step.kind`, the operation span its
move. Test: `trace-trees.test.ts`.
