// One Durable Object per world, holding its clock: a stepped instant, or a scaled one (an anchor and a speed).
import { DurableObject } from "cloudflare:workers";
import { RealDate } from "./world-date.ts";

interface Clock { readonly instant: number; readonly speed: number; readonly realAnchor: number }

export class World extends DurableObject {
  #clock: Clock | undefined;

  async #load(): Promise<Clock> {
    this.#clock ??= (await this.ctx.storage.get<Clock>("clock")) ?? { instant: Date.UTC(2026, 10, 1, 9), speed: 0, realAnchor: RealDate.now() };
    return this.#clock;
  }
  async #save(c: Clock): Promise<Clock> {
    this.#clock = c;
    await this.ctx.storage.put("clock", c);
    return c;
  }
  /** The world's instant now: fixed while stepped (speed 0), flowing at `speed` while scaled. */
  async now(): Promise<number> {
    const c = await this.#load();
    return c.speed === 0 ? c.instant : Math.floor(c.instant + (RealDate.now() - c.realAnchor) * c.speed);
  }
  async set(instant: number, speed = 0): Promise<number> {
    await this.#save({ instant, speed, realAnchor: RealDate.now() });
    return instant;
  }
  async advance(ms: number): Promise<number> {
    return this.set((await this.now()) + ms, (await this.#load()).speed);
  }
  /** What a Durable Object sees when it does not set the world's time at its own entry. */
  async unwrappedNow(): Promise<number> {
    return Date.now();
  }
}
