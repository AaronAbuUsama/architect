const text = (v: unknown): string =>
  typeof v === "string" ? v : typeof v === "bigint" ? v.toString() : JSON.stringify(v, (_, x: unknown) => (typeof x === "bigint" ? x.toString() : x));

/** A payload as span attributes: `payload.<field>`, every value as text so bigints and ids read the same everywhere. */
export const payloadAttributes = (payload: object): Record<string, string> =>
  Object.fromEntries(Object.entries(payload).map(([k, v]) => [`payload.${k}`, text(v)]));

export const principalAttributes = (principal: { readonly kind: string; readonly person?: string }): Record<string, string> =>
  principal.kind === "person" && principal.person ? { "principal.person": principal.person } : { "principal.kind": principal.kind };
