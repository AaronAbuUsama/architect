# links

Throwaway authenticated SIWE-link experiment. Owns public challenges and associations in real D1; callers retain their signing keys. AuthD1 and Principals authenticate an existing person/session, never a supplied person field. One conditional claim and association insert run in a transactional D1 batch. EOA signatures only.

Run `pnpm prove` from the spike root. All assertions use the HTTP interface; no platform shim or private AuthD1 import.
