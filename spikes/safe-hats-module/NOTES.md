# Goal 7 running notes

1. **Pins verified.** Safe Smart Account 1.5.0 uses the current
   `isValidSignature(bytes32,bytes)` owner-signature path and ships the
   CompatibilityFallbackHandler. Its npm publication is dated 2 February 2026.
   Hats v1 is the 11 July 2023 release, resolved to an exact commit. Its solbase
   gitlink is pinned separately so the same source builds without fetching Hats'
   unrelated test dependencies. The existing EVM spike's compiler and npm
   versions carry over. All dates and sources are in `versions.json`.
   The lead moved the five Safe proofs ahead of Hats. Those are next.
