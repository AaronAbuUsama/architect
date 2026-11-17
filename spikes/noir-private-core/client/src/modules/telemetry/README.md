# Telemetry

Owns safe recording. Span attributes have an allowlist. Span exit causes are
replaced before recording. SDK log messages are reduced to fixed metadata at
the logging stream. Raw messages are inspected transiently and never retained;
the adapter stores only watch-list hit indexes and fixed log metadata.

The tests inject a private value into a failure cause and a library log.
The private value must be detected in the raw log and absent from recordings.
