import re, os, json
os.chdir(os.path.dirname(os.path.abspath(__file__)))
html=open('../v6/index.html').read()
head=html[:html.index('<header>')]
markup=html[html.index('<header>'):html.index('<script>\nconst ')]
i=markup.index('<main id="explorer-view" hidden>')
markup=markup.replace(markup[i:markup.index('</main>', i)+len('</main>')], open('explorer.html').read())
k=head.find('\n/* IDE: editor split on top')
if k>=0: head=head[:k]+head[head.index('</style>',k):]
head=head.replace('</style>', open('extra.css').read()+'</style>',1)
P='<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markdown.min.js"></script>'
head=head.replace(P, P+'\n<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-solidity.min.js"></script>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-ruby.min.js"></script>')
markup=markup.replace(P, P+'\n<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-solidity.min.js"></script>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-ruby.min.js"></script>')
v6files=open('../v6/files.v2.js').read()
i=v6files.index('{ p: "acme/generated/model/model.json"'); i=v6files.index('`',i)+1; j=v6files.index('` },',i)
v6files=(v6files[:i]+open('model.final.json').read()+v6files[j:]).replace('const FILES = [','const V6_FILES = [',1)
glue='''
const fixNames = (c) => c.replace(/Blueprint\\.(thing|event|journey)\\("[^"]*", \\{/g, "Blueprint.$1({").replace(/Blueprint\\.error\\("[^"]*", /g, "Blueprint.error(");
const VAULT = Object.entries(LAYERED).map(([p, f]) => ({ p, k: f.k, n: f.n, c: at(p, 9) }));
const FILES = [
  ...V6_FILES.filter((f) => !/invitation|invite-and-accept/.test(f.p) && !LAYERED[f.p]).map((f) => ({ ...f, c: fixNames(f.c) })),
  ...VAULT,
  ...STD,
];
'''
pages='''/* ---------- Docs pages ---------- */
const f = (p, label) => '<a href="#' + fid(p) + '">' + (label || p.split("/").slice(-1)[0]) + '</a>';
const ALL_PAGES = [
'''+open('pages.new.js').read()+open('pages.start.js').read()+open('pages.ref.js').read()+'''
];
const PAGE_ORDER = ["get", "intro", "loop", "layers", "example", "day", "effect", "native", "concepts", "operations", "auth", "worlds", "proof", "deploy", "runtime", "clock-design",
  "std", "chain-kit", "dependencies", "targets", "time", "layout", "conventions", "starter", "generate", "check", "infra", "state", "agents", "open"];
const PAGES = PAGE_ORDER.map((id) => ALL_PAGES.find((p) => p.id === id)).filter(Boolean);
'''
render=open('render.js').read().replace('window.addEventListener("hashchange", route);\nroute();', open('../tail.js').read()).replace('renderDoc(h || "intro")','renderDoc(h || "get")').replace('go("intro")','go("get")')
audio=json.load(open('audio.json')) if os.path.exists('audio.json') else {}
js='const AUDIO = '+json.dumps(audio)+';\n'+v6files+'\n'+open('files.layered.js').read()+'\n'+open('files.envs.js').read()+'\n'+open('files.std.js').read()+glue+pages+open('steps.v8.js').read()+'\n'+open('lifecycle.js').read()+'\n'+render
for a,b in [('import { Worker } from "@alchemy.run/cloudflare"\nimport { Branch } from "@alchemy.run/neon"','import { Worker, D1Database } from "@alchemy.run/cloudflare"'),
    ('  database: Branch("acme-test-db", { project: "acme" }),','  database: D1Database("acme-test-db"),            // a fresh D1 database per world'),
    ('// cloudflare(), neon()','// cloudflare(), d1()'),
    ('Cloud.neon()','Cloud.d1()'),
    ('//   const { role } = yield* acme.invitation.accept({ invitation })','//   const { remaining } = yield* acme.allowance.spend({ allowance, amount, memo })'),
    ('// "invitation.accept"','// "allowance.spend"'),
    ('export * as invitation from "./invitation"','export * as allowance from "./allowance"'),
    ('architect/packages/architect/src/prove/','architect/packages/prove/src/'),('architect/packages/architect/src/model/','architect/packages/compiler/src/model/'),('architect/packages/architect/src/','architect/packages/blueprint/src/')]:
    js=js.replace(a,b)
out=head+markup+'<script>\n'+js+'\n</script>\n'
open('index.html','w').write(out)
open('check.js','w').write(js)
print(len(out))
