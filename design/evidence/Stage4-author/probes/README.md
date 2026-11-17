# Pinned host capability observation

The Node SDK fixture uses the actual `node:sqlite` DatabaseSync type/runtime. Node executes it; the pinned workerd
with `nodejs_compat` exposes the name but its native constructor throws `Illegal constructor`. The actual observation
is in capture 09. The probe's urllib readiness loop retried HTTP 500, so its summary has a null HTTP-status field:
that is **not** evidence that the Worker never started. The retained Wrangler log explicitly shows Ready and the
native constructor's 500 failures. No SQLite compatibility implementation was supplied by this author.

The files under `node-module/` are the exact standalone control sources. To reproduce, copy that directory to
`.architect/node-module-probe/` before running its `run.py`, in an exclusive window for port 19179. Its fresh child
process group is stopped in `finally`. The future generated-dependency case uses an eager native SDK initializer so
an unsupported Worker fails at module initialization rather than manufacturing a project refusal from a shim.
This control is not proof that the currently unimplemented dependency-generation path has executed.
