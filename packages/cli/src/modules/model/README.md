# model

`forman model [--json] [--root <dir>]`: what the compiler sees in a project. `--json` prints the whole model, the
same JSON every generator reads; without it, one line per thing and operation with its hash. An invalid blueprint
prints every problem and exits 2. The command returns what it has to say; `main.ts` prints it.
