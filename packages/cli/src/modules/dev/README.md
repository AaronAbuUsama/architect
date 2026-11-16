# dev

`architect dev [--root <dir>] [--port <n>]`: runs the project's generated Worker on real workerd through `wrangler dev`,
with the world Durable Object and a fresh local D1 holding the model's tables. Each run starts a new world with a new
secret for its test tokens, passed to wrangler as an argument and never written to a file. Ready once
`/_world/health` answers; stopped, with wrangler, when the command is interrupted. Wrangler's output is in
`.architect/dev/wrangler.log`.
