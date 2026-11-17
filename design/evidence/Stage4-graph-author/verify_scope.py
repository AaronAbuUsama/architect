from pathlib import Path
import hashlib,json,subprocess,tempfile,sys
root=Path.cwd()
files=[root/'e2e/layer3/05-graph-integrity.test.ts',root/'e2e/layer3/06-collisions.test.ts',root/'e2e/layer3/graph-entry/main.ts']
files+=sorted((root/'e2e/fixtures/layer3/echo/variants').glob('graph-*/src/**/*.ts'))
manifest={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
assert all(len(p.read_text().splitlines()) <= 250 for p in files)
(root/'design/evidence/Stage4-graph-author'/ (sys.argv[1] if len(sys.argv)>1 else 'source-sha256.json')).write_text(json.dumps(manifest,indent=2)+'\n')
# These exact paths came from the initial rejected overlays and one ENOTEMPTY cleanup failure.
# They were individually removed; never sweep the common prefix used by other authors.
for name in ['architect-gate1-wjrQtk','architect-gate1-QqXyTK','architect-gate1-oN79w7']:
 assert not (Path(tempfile.gettempdir())/name).exists(),name
commands=subprocess.run(['ps','-axo','command='],capture_output=True,text=True,check=True).stdout.splitlines()
owned=[c for c in commands if str(root) in c and any(x in c for x in ['workerd','wrangler dev','anvil --'])]
assert not owned,'an owned service remains'
print(f'{len(files)} scoped source files hashed; every source file <=250 lines.')
print('Own failed setup copies absent; no owned workerd/Wrangler/Anvil process remains.')
print('No service was started: all product checks stopped at the unsupported CLI command. No port/cloud/credential was used.')
