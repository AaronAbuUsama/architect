# Pinned SDK logging evidence

This source review is against the installed `@aztec/*@5.3.0` sources. Paths below are relative to `client/node_modules`, reproduced by the lockfile. No runtime key or private address value is retained here.

- `@aztec/pxe/src/pxe.ts:1170`: `registerContract` logs the INFO message `Added contract at ${address}` and structured `{ address }`. Registering the unpublished organisation through the wallet reaches this path.
- `@aztec/pxe/src/pxe.ts:927` and `:930`: account registration logs already-registered and `Registered account ${accountCompleteAddress.address.toString()}` messages at INFO. Supplying the shared key through `BaseWallet.registerContract`, at `@aztec/wallet-sdk/src/base-wallet/base_wallet.ts:386`, reaches account registration.
- `@aztec/pxe/src/pxe.ts:1061` and `:1066`: sender registration includes the sender address at INFO. The runner registers party and organisation senders.

The full run found 22 tracked encoding matches in raw SDK messages. The watch set includes some public identifiers, so this is not 22 distinct proven private leaks. The source paths independently establish that private organisation and party identifiers can enter raw INFO logs. Keeping the SDK at INFO is therefore insufficient for the stated address-privacy boundary.

The client recording adapter drops message text, structured data and actor/module labels. Its records contain only a fixed source, finite severity and a fixed redacted event. Span names, attribute values and outcome tags are finite allowlists; exit payloads are replaced. Unknown top-level failures are recorded only as a fixed category. Adversarial tests inject a private error payload, private name/attribute and a private numeric severity. None appears in the resulting recording.
