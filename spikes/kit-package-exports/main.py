#!/usr/bin/env python3
"""Isolated spike runner. Its receipts identify the pre-commit tree honestly."""
import hashlib
import datetime
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import tarfile
import time

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
WORK = ROOT / ".architect"
EVIDENCE = ROOT / "evidence"
EVIDENCE.mkdir(exist_ok=True)
WORK.mkdir(exist_ok=True)
records = []
worker_groups = []
BASE = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO, text=True).strip()


def run(name, cmd, expected=0, cwd=ROOT):
    started = time.monotonic()
    result = subprocess.run(cmd, cwd=cwd, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    receipt = {"name": name, "command": cmd, "cwd": str(cwd.relative_to(REPO)), "exit": result.returncode,
               "captured_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
               "expected_exit": expected, "elapsed_seconds": round(time.monotonic() - started, 3),
               "base_commit": BASE, "source_commit": "pending: uncommitted spike worktree", "output": f"{name}.txt"}
    records.append(receipt)
    (EVIDENCE / receipt["output"]).write_text(result.stdout)
    (EVIDENCE / "commands.json").write_text(json.dumps(records, indent=2) + "\n")
    print(f"{name}: exit {result.returncode} expected {expected} ({receipt['elapsed_seconds']}s)", flush=True)
    if result.returncode != expected:
        print(result.stdout)
        raise RuntimeError(name)
    return result.stdout


def available(port):
    with socket.socket() as sock:
        return sock.connect_ex(("127.0.0.1", port)) != 0


def prepare():
    for port in (19100, 19101):
        if not available(port):
            raise RuntimeError(f"port {port} already occupied; untouched")
    run("01-toolchain", ["node", "-e", 'const fs=require("node:fs"); for(const p of ["node_modules/effect/package.json","packages/host-cloudflare/node_modules/wrangler/package.json","node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/package.json"]) { const v=JSON.parse(fs.readFileSync(p)); console.log(v.name+"@"+v.version); }'], cwd=REPO)
    dependency = ROOT / "fixture/node_modules/@architect/blueprint"
    dependency.parent.mkdir(parents=True, exist_ok=True)
    if not dependency.exists():
        dependency.symlink_to(REPO / "packages/blueprint", target_is_directory=True)
    run("02-package-build", ["node", "build.mjs", "package"])
    run("02-package-types", [str(REPO / "node_modules/.bin/tsc"), "-p", "fixture/tsconfig.json"])
    run("03-package-pack", ["npm", "pack", "--ignore-scripts", "--pack-destination", str(WORK)], cwd=ROOT / "fixture")
    package = ROOT / "project/node_modules/@architect/spike-fixture-kit"
    package.mkdir(parents=True, exist_ok=True)
    tgz = next(WORK.glob("*.tgz"))
    with tarfile.open(tgz) as archive:
        for member in archive.getmembers():
            if member.name.startswith("package/"):
                member.name = member.name[len("package/"):]
                if member.name:
                    target = package / member.name
                    if member.isfile() and ".." not in Path(member.name).parts:
                        target.parent.mkdir(parents=True, exist_ok=True)
                        target.write_bytes(archive.extractfile(member).read())
    for name, source in (("effect", REPO / "node_modules/effect"), ("@architect/blueprint", REPO / "packages/blueprint")):
        dest = ROOT / "project/node_modules" / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists():
            dest.symlink_to(source, target_is_directory=True)
    (EVIDENCE / "package.json").write_text(json.dumps({"archive": tgz.name, "sha256": hashlib.sha256(tgz.read_bytes()).hexdigest(), "entries": sorted(str(p.relative_to(package)) for p in package.rglob("*") if p.is_file())}, indent=2) + "\n")
    run("04-node-exports", ["node", "project/main.ts"])
    run("04-project-typecheck", [str(REPO / "node_modules/.bin/tsc"), "-p", "project/tsconfig.json"])
    run("05-positive-bundles", ["node", "build.mjs", "positive"])
    for name, tier in (("client-api", "client"), ("client-sdk", "client"), ("worker", "worker")):
        run(f"06-closure-{name}", ["node", "guard.mjs", tier, f".architect/bundles/{name}.meta.json"])
        metadata = json.loads((WORK / f"bundles/{name}.meta.json").read_text())
        (EVIDENCE / f"{name}.meta.json").write_text(json.dumps(metadata, separators=(",", ":")) + "\n")
    run("07-negative-bundle", ["node", "build.mjs", "negative-guard"])
    run("08-negative-closure", ["node", "guard.mjs", "client", ".architect/bundles/negative-client.meta.json"], expected=1)
    metadata = json.loads((WORK / "bundles/negative-client.meta.json").read_text())
    (EVIDENCE / "negative-client.meta.json").write_text(json.dumps(metadata, separators=(",", ":")) + "\n")
    run("09-negative-worker-platform", ["node", "build.mjs", "negative-worker"], expected=1)


def worker():
    command = [str(REPO / "packages/host-cloudflare/node_modules/.bin/wrangler"), "dev", "--local", "--ip", "127.0.0.1", "--port", "19100", "--inspector-port", "19101", "--persist-to", str(WORK / "state")]
    env = {**os.environ, "WRANGLER_SEND_METRICS": "false", "WRANGLER_LOG_PATH": str(WORK / "wrangler-internal.log")}
    start = time.monotonic()
    with (EVIDENCE / "10-worker.txt").open("w") as log:
        process = subprocess.Popen(command, cwd=ROOT / "project", env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        worker_groups.append(process.pid)
        try:
            for _ in range(120):
                if process.poll() is not None:
                    raise RuntimeError("wrangler stopped before readiness")
                if not available(19100):
                    break
                time.sleep(0.25)
            else:
                raise RuntimeError("worker readiness timeout")
            run("11-worker-sdk-call", ["node", "project/main.ts", "http://127.0.0.1:19100"])
            run("12-worker-bad-payload", ["curl", "--silent", "--show-error", "--fail-with-body", "-H", "content-type: application/json", "-d", '{"text":123}', "http://127.0.0.1:19100/kit/fixture/echo/repeat"], expected=22)
        finally:
            if process.poll() is None:
                os.killpg(process.pid, signal.SIGTERM)
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait(timeout=5)
            records.append({"name": "10-worker", "command": command, "cwd": str((ROOT / "project").relative_to(REPO)), "exit": process.returncode, "expected_exit": "terminated after scoped experiment", "elapsed_seconds": round(time.monotonic() - start, 3), "base_commit": BASE, "source_commit": "pending: uncommitted spike worktree", "output": "10-worker.txt", "owned_pid": process.pid})


try:
    prepare()
    worker()
finally:
    processes = subprocess.check_output(["ps", "-axo", "pid=,pgid=,comm="], text=True)
    remaining = [line.strip() for line in processes.splitlines() if len(line.split()) > 1 and int(line.split()[1]) in worker_groups]
    cleanup = {"ports": {str(port): "free" if available(port) else "occupied" for port in range(19100, 19110)}, "owned_process_groups": worker_groups,
               "remaining_owned_processes": remaining, "own_worker_process_group_terminated": len(remaining) == 0}
    (EVIDENCE / "cleanup.json").write_text(json.dumps(cleanup, indent=2) + "\n")
    (EVIDENCE / "commands.json").write_text(json.dumps(records, indent=2) + "\n")
    print(json.dumps(cleanup), flush=True)
