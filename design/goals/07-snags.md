# Goal 7: what supervising Codex taught us

The lead's log of Goal 7, where a Claude lead supervises Codex run headless (`07-safe-hats.md`). It feeds Foreman
(`design/decisions/F9-foreman.md`): each entry is something a supervisor had to notice, steer or fix, and what would
have caught it sooner.

Each entry looks like this:

```md
## S-01 · <area> · "<what it looked like>"
- Seen: what the lead saw in the log, the diff or a run, and when.
- Cost: runs, minutes or tokens lost.
- Steer: what the lead sent Codex, or fixed itself.
- For Foreman: what a supervisor should watch for, or what a brief should say up front.
```

Numbers are this log's own, from S-01.

## S-01 · scope · "a second goal's needs arrived ten minutes after the builder started"
- Seen: Goal 4's lead sent five Safe questions that its slice 7 rests on. Codex was still verifying pins, so it had
  written nothing yet.
- Cost: one stopped run and one resume, a few minutes. A headless `codex exec` can't take a message mid-run, so a steer
  means stopping it, by PID, and resuming the same session.
- Steer: run 1 was stopped, then resumed as run 2 with A1 to A5 first and the budgets module shaped to `M6-chain.md`.
- For Foreman: before starting a builder, ask every goal that depends on its area what it needs from it. Here the
  conductor, or the board's links, would have shown Goal 4 waiting on Safe answers. Steering costs a restart, so steer
  early and in batches.
