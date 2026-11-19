"""Fold an ArtifactData export into the skill's data/ snapshot.

Export first, one ArtifactData `list` per collection with `out_dir` set to the same folder:
    tasks, threads, lanes, meta   (query.limit 1000)
That writes <out_dir>/<collection>/<id>.json. Then:
    python3 -I .agents/skills/kanban/scripts/snapshot.py <out_dir>
It rewrites data/<collection>.json as {id: document}, sorted, so a diff shows what changed on the board.
"""
import glob
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
COLLECTIONS = ["tasks", "threads", "lanes", "meta"]


def main(out_dir):
    for name in COLLECTIONS:
        docs = {}
        for path in sorted(glob.glob(os.path.join(out_dir, name, "*.json"))):
            with open(path) as f:
                doc = json.load(f)
            docs[os.path.basename(path)[:-5]] = doc.get("data", doc)
        if not docs:
            print(f"{name}: nothing exported, left as it was")
            continue
        with open(os.path.join(DATA, f"{name}.json"), "w") as f:
            json.dump(docs, f, indent=1, ensure_ascii=False, sort_keys=True)
            f.write("\n")
        print(f"{name}: {len(docs)}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: snapshot.py <export dir>")
    main(sys.argv[1])
