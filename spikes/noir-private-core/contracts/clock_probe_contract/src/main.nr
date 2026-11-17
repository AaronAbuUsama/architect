use aztec::macros::aztec;
#[aztec]
pub contract ClockProbe {
    use aztec::macros::functions::external;
    // Ordinary private transaction: no role, budget, public read or custom time bound.
    #[external("private")]
    fn tick(salt: Field) { self.context.push_nullifier_unsafe(salt); }
}
