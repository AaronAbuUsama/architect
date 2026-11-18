// PROPOSED (design/decisions/K1-kits.md). A sketch of acme with kits mounted: not compiled, not imported.
// Written by `architect add kit @architect/kit-wallets`. The file's name is the mount's: the kit's things keep their
// own names (wallet.create, wallet.link, ...).
import { Blueprint } from "@architect/blueprint";
import wallets from "@architect/kit-wallets";
import { list } from "@architect/kit-wallets/blueprint";

export default Blueprint.use(wallets, {
  choices: { browserSigner: "passkey" },
  // Tighten, never widen, and always by reference: acme keeps its linked wallets away from API keys too.
  narrow: [Blueprint.narrow(list, { via: ["session", "device", "agent"] })],
});
