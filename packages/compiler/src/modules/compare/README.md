# compare

Two models side by side. `Compare.models` lists each value, thing and operation that was added, removed or changed,
with the parts of its entry that changed. `Compare.dependsOn` names what an operation's proof rests on (itself, its
thing, the things its fields refer to) with their hashes, so `prove` can key its evidence by them and `impact` can
tell which proofs went stale. Pure: models in, values out.
