# The portal's design (M1.25)

Draft, in progress with Aaron. The full design is written once rounds 1 and 2 are answered.

## Aaron's answers

### Round 1 (18 November 2026, by speech, relayed by the conductor)

- **Q1, the chat: A.** "We are defo using Pi Durable for the portal's chat. We are going to make our own thing on top of
  Pi Durable that can automatically connect into any function and use the application, whatever it is you're building.
  But in the portal we are going to have a customised set of agents for building the application." So the chat's
  surface is Pi Durable, with our own layer on top that reaches every action. The building agents (the factory) are
  designed in their own 📐 thread; this design covers the chat surface and its place in the portal only.
- **Q8, HeroUI Pro: neither A nor B.** "We're using it privately anyway, so it's no problem for now. If it ever does
  become a problem, we'll just clean-room the components that we need." So the portal is HeroUI Pro only, with no free
  face. **Fallback, recorded:** if Pro's licence ever blocks distribution, we clean-room the components the portal uses
  into our own package; the page contract stays as it is, so only the face changes.
- **Q2 to Q7:** open, put back in round 2.
