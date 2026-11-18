Each port has one in-memory nonce manager. Reservations start at the pending chain
nonce and allocate atomically by sender. Abandoned preparations can be released.
After a send is attempted, its reservation is retained and the same signed bytes
can be retried. Finalized transaction counts allow the manager to reclaim old
broadcast reservations. Use one port per chain and signer process.
