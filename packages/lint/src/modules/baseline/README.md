# baseline

The breaches of the repository's own code rules (`ortho/effect-only`, `ortho/max-lines`, `ortho/six-slots`) that existed
when each rule arrived, file by file, in `packages/lint/baseline.json`. A rule tolerates up to its count in a file and
reports every breach in the file once there are more. Pure: `count`, `compare`, `shrink` and `render`; the command that
runs oxlint and writes the file is `packages/lint/scripts/baseline.ts`. How it shrinks: `packages/lint/README.md`.
