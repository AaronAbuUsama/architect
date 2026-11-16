// A cheap hasher for local/test: PBKDF2-SHA256 via WebCrypto (native in workerd).
const ITER = 1000
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const derive = async (password: string, salt: Uint8Array) => {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITER }, key, 256))
}
export const hash = async (password: string) => {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return `pbkdf2$${b64(salt)}$${b64(await derive(password, salt))}`
}
export const verify = async ({ hash: stored, password }: { hash: string; password: string }) => {
  const [, s, h] = stored.split("$")
  const got = await derive(password, unb64(s!))
  const want = unb64(h!)
  return got.length === want.length && got.every((v, i) => v === want[i])
}
