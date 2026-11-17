"""Rebuild/check this spike's fixture script from the pinned generated artifacts. No server."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
REVISION = "b9cc55f0bb0401d6d593024487871465b19507f5"
SOURCES = {
    "acme-model.json": "examples/acme/generated/model/model.json",
    "acme-edges.json": "examples/acme/generated/model/edges.json",
    "acme-spend.md": "examples/acme/generated/docs/allowance/spend.md",
}


def expected_script():
    model_bytes = (ROOT / "acme-model.json").read_bytes()
    data = {
        "revision": REVISION,
        "model": json.loads(model_bytes),
        "edges": json.loads((ROOT / "acme-edges.json").read_text()),
        "modelSha256": hashlib.sha256(model_bytes).hexdigest(),
    }
    return (
        "// Generated from spikes/frontend-dx/acme-model.json and acme-edges.json. Do not edit.\n"
        "const ACME = " + json.dumps(data, separators=(",", ":")) + ";\n"
        "// Generated from examples/acme/generated/docs/allowance/spend.md at the reviewed revision. Do not edit.\n"
        "const SPEND_DOC = " + json.dumps((ROOT / "acme-spend.md").read_text()) + ";\n"
    )


def main():
    for local, source in SOURCES.items():
        expected = subprocess.check_output(["git", "show", f"{REVISION}:{source}"], cwd=ROOT)
        if (ROOT / local).read_bytes() != expected:
            sys.exit(f"FAIL: {local} differs from pinned generated artifact")
    script = expected_script()
    if "--check" in sys.argv:
        if (ROOT / "acme-data.js").read_text() != script:
            sys.exit("FAIL: acme-data.js needs regeneration")
    else:
        (ROOT / "acme-data.js").write_text(script)
    print("PASS: three generated fixtures match the pinned revision; fixture script is reproducible")


if __name__ == "__main__":
    main()
