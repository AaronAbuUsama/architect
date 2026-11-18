// Q6: a minimal chain follower. Reads ProposalOpened with a checkpoint, decides "confirmed" by depth and/or the
// safe/finalized tags, notices a reorg by comparing stored block hashes, and emits corrections.
// Plain state in, events out: the state is JSON so a restart resumes from the checkpoint.
import { getAbiItem, keccak256, toHex, type Address, type Hex, type PublicClient } from "viem";
import { miniDaoAbi } from "../../gen/abi.ts";

export type Policy = { depth?: number; tag?: "safe" | "finalized" }; // confirmed when EITHER holds
type Seen = { proposal: Hex; digest: Hex; block: number; hash: Hex; tx: Hex; logIndex: number; confirmed: boolean };
export type State = { checkpoint?: { number: number; hash: Hex }; window: Record<string, Hex>; seen: Seen[] };
export type FollowEvent =
  | { t: "observed"; proposal: Hex; digest: Hex; block: number }
  | { t: "confirmed"; proposal: Hex; block: number; by: string; link: "published" | "digest-mismatch" | "no-revision" }
  | { t: "correction"; proposal: Hex; digest: Hex; block: number; wasConfirmed: boolean; why: string }
  | { t: "reorg"; ancestor: number; oldCheckpoint: number; newHead: number };

/** The "publishing" link: a D1 revision body is frozen; its digest is what the chain event must carry. */
export const revisionDigest = (body: string): Hex => keccak256(toHex(body));
const EVENT = getAbiItem({ abi: miniDaoAbi, name: "ProposalOpened" });

export const emptyState = (): State => ({ window: {}, seen: [] });

export const follower = (cfg: { client: PublicClient; address: Address; policy: Policy; fromBlock: bigint; revisions: Map<Hex, string>; state?: State; window?: number }) => {
  const st: State = cfg.state ?? emptyState();
  const keep = cfg.window ?? 128;
  const hashAt = async (n: number) => (await cfg.client.getBlock({ blockNumber: BigInt(n) }).catch(() => undefined))?.hash;

  const poll = async (): Promise<FollowEvent[]> => {
    const out: FollowEvent[] = [];
    const head = await cfg.client.getBlock();
    const headN = Number(head.number);

    // 1. reorg check: is our checkpoint still canonical? If not, walk back the stored window to the common ancestor.
    if (st.checkpoint && (st.checkpoint.number > headN || (await hashAt(st.checkpoint.number)) !== st.checkpoint.hash)) {
      let ancestor = -1;
      for (const n of Object.keys(st.window).map(Number).sort((a, b) => b - a)) {
        if (n <= headN && (await hashAt(n)) === st.window[n]) { ancestor = n; break; }
      }
      out.push({ t: "reorg", ancestor, oldCheckpoint: st.checkpoint.number, newHead: headN });
      for (const s of st.seen.filter((x) => x.block > ancestor))
        out.push({ t: "correction", proposal: s.proposal, digest: s.digest, block: s.block, wasConfirmed: s.confirmed, why: "block no longer canonical" });
      st.seen = st.seen.filter((x) => x.block <= ancestor);
      for (const k of Object.keys(st.window)) if (Number(k) > ancestor) delete st.window[k];
      st.checkpoint = ancestor >= 0 ? { number: ancestor, hash: st.window[ancestor]! } : undefined;
    }

    // 2. scan new blocks: remember their hashes (the window), read the logs
    const from = st.checkpoint ? st.checkpoint.number + 1 : Number(cfg.fromBlock);
    if (from <= headN) {
      for (let n = from; n <= headN; n++) st.window[n] = n === headN ? head.hash : (await hashAt(n))!;
      const logs = await cfg.client.getLogs({ address: cfg.address, event: EVENT, fromBlock: BigInt(from), toBlock: BigInt(headN), strict: true });
      for (const l of logs) {
        const block = Number(l.blockNumber);
        if (st.window[block] !== l.blockHash) continue; // the chain moved between the two calls; next poll will catch it
        st.seen.push({ proposal: l.args.proposal, digest: l.args.digest, block, hash: l.blockHash, tx: l.transactionHash, logIndex: l.logIndex, confirmed: false });
        out.push({ t: "observed", proposal: l.args.proposal, digest: l.args.digest, block });
      }
      st.checkpoint = { number: headN, hash: head.hash };
      for (const k of Object.keys(st.window)) if (Number(k) < headN - keep) delete st.window[k];
    }

    // 3. confirmation: depth and/or the node's own safe/finalized tags
    const tagBlock = async (t: "safe" | "finalized") => Number((await cfg.client.getBlock({ blockTag: t })).number);
    const safeN = cfg.policy.tag === "safe" ? await tagBlock("safe") : -1;
    const finN = cfg.policy.tag === "finalized" ? await tagBlock("finalized") : -1;
    for (const s of st.seen.filter((x) => !x.confirmed)) {
      const by = cfg.policy.depth !== undefined && headN - s.block + 1 >= cfg.policy.depth ? `depth>=${cfg.policy.depth}`
        : cfg.policy.tag === "safe" && s.block <= safeN ? "safe" : cfg.policy.tag === "finalized" && s.block <= finN ? "finalized" : undefined;
      if (!by) continue;
      s.confirmed = true;
      const body = cfg.revisions.get(s.proposal);
      out.push({ t: "confirmed", proposal: s.proposal, block: s.block, by, link: body === undefined ? "no-revision" : revisionDigest(body) === s.digest ? "published" : "digest-mismatch" });
    }
    return out;
  };
  return { poll, state: st };
};
