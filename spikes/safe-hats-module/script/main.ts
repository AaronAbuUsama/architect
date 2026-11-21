import { withAnvil } from "./chain.ts"
import { proveGoal4 } from "./goal4.ts"
import { proveHats } from "./hats.ts"

await withAnvil(async (chain) => {
  const world = await proveGoal4(chain)
  console.log("HATS")
  await proveHats(chain, world)
})
