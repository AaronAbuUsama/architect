# Network probes

Owns the two network observations the TXE cannot establish: admission conflicts
for competing nullifiers and inclusion across a UTC month boundary. Calls real
node and admin APIs. Equal-fee races are rejected at admission; forced dual
admission and in-block sequencing are not tested. Clock approach steps use 22
hours and finality batches. Near midnight, short steps deliberately avoid epoch
settlement. Both L1 and L2 are consulted to avoid backward warps. Waits use the
harness's counted timer.

Acceptance checks were independently written in evidence/acceptance.md before
the implementation. Run the main entry against a freshly started local network.
