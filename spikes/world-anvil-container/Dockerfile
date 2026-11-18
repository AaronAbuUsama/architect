# Official Foundry 1.8.6. The run records and verifies its immutable registry digest.
FROM ghcr.io/foundry-rs/foundry:v1.8.6@sha256:4a16a86f41d30418fbdca47ce2868121bbb0aeaa0a34bde2dd1e2911c4be2464
ARG SPIKE_OWNER
LABEL architect.spike.owner=$SPIKE_OWNER
COPY entrypoint.sh /usr/local/bin/architect-spike-entrypoint
ENTRYPOINT ["/bin/sh", "/usr/local/bin/architect-spike-entrypoint"]
