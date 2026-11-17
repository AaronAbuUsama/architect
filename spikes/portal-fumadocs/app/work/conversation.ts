// A manager's conversation with you: intake first (questions from the blueprint's gaps), then orchestration. Made up.

export type Msg =
  | { kind: "you"; at: string; text: string }
  | { kind: "manager"; at: string; text: string }
  | { kind: "choice"; at: string; question: string; from: string; options: Array<[letter: string, text: string]>; picked?: string }
  | { kind: "approve"; at: string; title: string; why: string; task: string; done?: "approved" | "not yet" }
  | { kind: "system"; at: string; text: string; run?: string; task?: string; tone?: "good" | "bad" };

export const conversations: Record<string, Msg[]> = {
  allowances: [
    { kind: "you", at: "Nov 12 09:02", text: "Get allowances to production." },
    { kind: "manager", at: "Nov 12 09:02", text: "The blueprint has allowance with 4 operations. 2 have blanks, and spend refuses with OverLimit without saying when. Three questions, then I'll set the mission up." },
    { kind: "choice", at: "Nov 12 09:03", from: "allowance.spend · OverLimit has no when", question: "When does spend refuse with OverLimit?", options: [["A", "The amount is above what remains"], ["B", "Above what remains, or above a daily cap"], ["C", "Not sure yet: spike it"]], picked: "C" },
    { kind: "choice", at: "Nov 12 09:04", from: "allowance.revoke · 2 blanks", question: "What does revoking do to what's left?", options: [["A", "It's gone"], ["B", "It goes back to the grantor"]], picked: "B" },
    { kind: "choice", at: "Nov 12 09:05", from: "mission target", question: "How far should this go?", options: [["A", "Test"], ["B", "Staging"], ["C", "Production, with your yes for each promote"]], picked: "C" },
    { kind: "manager", at: "Nov 12 09:05", text: "Mission set: 2 milestones, 16 tasks from blueprint 53d028d, plus 1 spike. Nothing reaches production without your yes." },
    { kind: "system", at: "Nov 12 09:06", text: "Started specifier on the spike: daily cap or per-spend?", task: "t5" },
    { kind: "system", at: "Nov 13 10:02", text: "Spike answered: per-spend limit now, a daily cap later", task: "t5", tone: "good" },
    { kind: "system", at: "Nov 16 15:10", text: "Started builder on allowance.spend (kimi-k2)", run: "r_37" },
    { kind: "system", at: "Nov 16 15:31", text: "r_37 failed: out of budget with 3 journeys red", run: "r_37", tone: "bad" },
    { kind: "manager", at: "Nov 16 15:32", text: "kimi-k2 kept writing amount as a plain number. Next attempt on claude-sonnet-5-5, which is also on the builder's list." },
    { kind: "system", at: "Nov 17 09:34", text: "Started builder on allowance.spend (claude-sonnet-5-5)", run: "r_41" },
    { kind: "system", at: "Nov 17 10:01", text: "Started journey writer on allowance.revoke (qwen3-coder)", run: "r_42" },
    { kind: "system", at: "Nov 17 10:05", text: "allowance.spend: performance failed in test, 212 ms against 150", task: "t12", tone: "bad" },
    { kind: "system", at: "Nov 17 10:06", text: "Started SRE on the spend trace", run: "r_40" },
    { kind: "you", at: "Nov 17 10:09", text: "Why is spend still red?" },
    { kind: "manager", at: "Nov 17 10:09", text: "One eval out of nine. The SRE found spend reads the allowance twice; the second read is 61% of the time. r_41 already has that in hand and is re-running prove." },
    { kind: "approve", at: "Nov 17 10:12", title: "Promote allowance.grant to production?", why: "Proven 9 of 9 in test and staging. Production can't be undone for its data.", task: "t15" },
  ],
  invitations: [
    { kind: "you", at: "Nov 15 14:00", text: "Harden invitations up to staging." },
    { kind: "manager", at: "Nov 15 14:01", text: "Invitations has 3 operations, all built. 6 tasks: prove and promote each. Starting with send." },
    { kind: "system", at: "Nov 16 12:40", text: "invitation.accept proven in test", task: "t22", tone: "good" },
    { kind: "manager", at: "Nov 16 18:00", text: "Paused: today's spend reached this mission's share of the cap. I'll start again tomorrow unless you say otherwise." },
  ],
  "sign-in": [
    { kind: "manager", at: "Nov 10 17:20", text: "Sign-in v1 is in production. 9 of 9 tasks closed; the mission is done." },
  ],
};
