# Delivery and revocation availability

**Refuted by pinned source:** sharing the organisation's keys does not, by itself, guarantee that an honest admin can obtain every successor right note and make a revoke land after a malicious member's spend.

**Validated locally:** with the supplied, cooperative PXEs, the admin reads and consumes the current right, and a spend proven from that right before the revoke is rejected after the revoke lands.

**Not tested:** constructing a valid proof with deliberately corrupted or undiscoverable right ciphertext, then attempting the admin's revoke. This report does not describe that attack as a network execution.

## Why the source refutes the stronger claim

The current `PrivateCore.quiet` selects `onchain_unconstrained().with_sender(pool).via_address_derived_secret()`. Paths below are relative to `tools/aztec-packages/noir-projects/aztec-nr/aztec/src`, pinned to v5.3.0.

- `messages/delivery/builder.nr:108-114` specifies that unconstrained on-chain delivery guarantees a log, but permits its sender to alter the ciphertext or make discovery fail. The claim is not that the log can necessarily be omitted altogether.
- `messages/delivery/mod.nr:117-120` removes encryption constraints when delivery is not constrained. `utils/remove_constraints.nr:16-20` executes that closure unconstrained.
- `messages/delivery/tag.nr:67-72` leaves the discovery index untrusted in unconstrained mode.
- `note/lifecycle.nr:55-57` introduces fresh prover-chosen note randomness. `note/note_message.nr:82-93` includes this randomness in the delivered plaintext. The public commitment and shared viewing key cannot recover an undisclosed preimage from an invalid ciphertext.
- `state_vars/private_mutable.nr:192-200` reads the current note before it can destroy and replace it. A shared nullifier key does not remove that witness requirement.

The note's member, budget and update remain circuit-constrained. This is an availability and revoke-liveness gap, rather than a demonstrated way to exceed the budget or impersonate the admin. It precedes the successful-revoke safety guarantee: once an admin's revoke actually lands, the old note's nullifier still prevents the held spend.

## Why a one-word mode change is not a validated fix

`messages/delivery/builder.nr:196-198` returns `OnchainConstrainedDelivery`. It supports `with_sender` at `:328-330` and the non-interactive and interactive handshake derivations at `:337-339` and `:350-352`. It does not support `via_address_derived_secret`; `tag_secret_source.nr:95-98` rejects that unconstrained secret for constrained delivery.

Non-interactive discovery has a different privacy boundary. The builder documentation at `:188-192` explains that an observer who knows the recipient address can recognize its discovery messages. The literal-address byte scan in this spike does not test that recognition attack.

An interactive self-send is not automatic. PXE's self-send shortcut in `client/node_modules/@aztec/pxe/src/oracle/private_execution_oracle.ts:269-273` applies only to unconstrained delivery. Interactive handshakes need a custom recipient-signature request hook and learned ephemeral-key distribution across devices. The registry also stores and replaces its sender-owned handshake note using unconstrained address-derived delivery. These paths are in `noir-contracts/contracts/standard/handshake_registry_contract/src/main.nr:129-139,220-233`, relative to `tools/aztec-packages/noir-projects`. In a shared-key self model, the witness/handshake-availability argument therefore needs further validation. This spike has not implemented or validated that setup.

## The selected token API

`noir-contracts/contracts/app/token_contract/src/main.nr:270-275` selects constrained delivery for both `balances.at(from).sub(amount)` and `balances.at(to).add(amount)` in `transfer_in_private`. The core calls exactly that API. The simpler `transfer` and offchain variants have different delivery rules, but the core does not call them. There is no corresponding unconstrained token-change finding in the selected call.

The runner leaves PXE's default constrained-discovery strategy at non-interactive. Thus the selected token API brings the documented known-recipient-address discovery boundary, even though no literal organisation address appears in the retained public payload. An adversarial recognition probe is not tested here.

## Consequence for the lead

Do not promote this prototype into an always-revokable private authority target. Preserve its validated private-state, caller-integrity, budget and successful-revoke findings. Require separate delivery-integrity, discovery-privacy and witness-availability declarations and checks before claiming malicious-member revoke liveness. The bounded follow-ups are tracked in `../follow-ups.md`.
