# database

`Database.d1(env.DB)`: Effect's `SqlClient` over a D1 binding (`@effect/sql-d1`). Generated code and handlers depend on
`SqlClient` only; the host decides it is D1. Tests run in real workerd with a real local D1 through
`@cloudflare/vitest-pool-workers`, migrations applied from `test/migrations/`.
