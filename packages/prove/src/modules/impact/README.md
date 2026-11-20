# impact

What a blueprint change unproves. After every prove, `Impact.record` writes `.ortho/evidence/proven.json`: the
model just proven, and for each operation whose evals all passed, the hashes its proof rests on (from
`Compare.dependsOn`: itself, its thing, the things it refers to). `Impact.of` compares today's model with that
ledger: an operation is **stale** when one of those hashes changed, **proven** when none did, **unproven** when it was
never proven. `ortho impact` prints it, with each changed declaration first.

With the logbook's word (`Impact.lines(impact, shipped)`) the release's changes, `next <version>` and `stale <ops> in <envs>`
are printed instead of the local `stale` (see `releases`); what the local ledger finds stale is then `locally stale`.

## `prove --changed`

The ledger also carries `changed`, the record `ortho prove --changed` measures from (`Impact.select`, `Impact.settle`): a content
hash by relative path of every file that can change a proof (`blueprint/`, `src/`, `journeys/`, `ortho.config.ts`,
`package.json`, `pnpm-lock.yaml`, `tsconfig*.json`, `.env*`; not `generated/`, tests or notes), and per journey and per
operation a hash of the files it rests on (a journey: its file, its starting worlds and every operation they call; an operation:
its declaration and handler) with its last verdict. A run reruns the journeys whose hash moved, that failed, or that call an
operation whose evals have to be judged again (its hash moved, or it did not pass). A changed, added or removed file the model
cannot place (anything but a handler, a declaration, a journey or a starting world), or no record at all, runs everything and
says why. A full prove writes the same record, so a record made in one folder holds in a copy of it. See
`design/decisions/ST1-23-prove-changed.md`.
