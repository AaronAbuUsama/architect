"""Turn the data/ snapshot into ArtifactData batch files, to seed a new board.

    python3 -I .agents/skills/kanban/scripts/seed.py <out dir>

Writes <out dir>/docs/<collection>-<id>.json (one document each) and <out dir>/batch-<n>.json, each a list of at most
50 `set` writes. Pass each batch file's contents as `writes` to ArtifactData action "batch" on the new artifact's url.
The writes carry no `if_version`, so they only create documents: on a board that already has them the batch is
refused, which is what you want (update a live board with pinned `update` writes instead).
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
COLLECTIONS = ["lanes", "threads", "meta", "tasks"]


def main(out_dir):
    docs_dir = os.path.join(out_dir, "docs")
    os.makedirs(docs_dir, exist_ok=True)
    writes = []
    for name in COLLECTIONS:
        with open(os.path.join(DATA, f"{name}.json")) as f:
            docs = json.load(f)
        for doc_id, doc in docs.items():
            path = os.path.abspath(os.path.join(docs_dir, f"{name}-{doc_id}.json"))
            with open(path, "w") as f:
                json.dump(doc, f, ensure_ascii=False)
            writes.append({"op": "set", "collection": name, "doc_id": doc_id, "file_path": path})
    for n in range(0, len(writes), 50):
        with open(os.path.join(out_dir, f"batch-{n // 50 + 1}.json"), "w") as f:
            json.dump(writes[n : n + 50], f)
    print(f"{len(writes)} writes in {(len(writes) + 49) // 50} batches under {out_dir}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: seed.py <out dir>")
    main(sys.argv[1])
