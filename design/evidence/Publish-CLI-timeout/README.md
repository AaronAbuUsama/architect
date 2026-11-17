# Publish CLI integration body budget

The full failed main job output is retained under `attempts/main-ci-failed-job.log`; the short captured excerpt and
`ci.json` identify run 44029791265, job 133858681138 and its actual failed main head. This is the real Linux failure,
not a locally manufactured timeout. The retained CI metadata remains failed until the conductor records a successful
recovery run.

The focused local command selects one test with `-t 'without a registry'`. Its five sibling bodies are therefore
unselected in that invocation. No skip declaration was added. The unchanged before/after fixture starts the actual
OIDC issuer, Verdaccio and workerd logbook and cleans up its own resources. No full gate was rerun for this one-line
test-body deadline correction.
