"""Builds design/evidence/index.html from the captured runs in design/evidence/<step>/. Run: python3 tools/evidence/page.py"""
import glob, html, json, os, re

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
EV = os.path.join(ROOT, "design", "evidence")
REPO = "https://github.com/AaronAbuUsama/architect"

def capture(path):
    lines = open(path).read().split("\n")
    cmd, meta, body = lines[0], lines[1], "\n".join(lines[3:]).strip()
    m = re.search(r"commit (\w+) · (\S+) · exit (\d+) \(expected (\d+)\) · (\S+)", meta)
    commit, when, code, expect, took = m.groups()
    return dict(cmd=cmd[2:], commit=commit, when=when, code=code, expect=expect, took=took, body=body)

def run_html(name, cap, caption):
    ok = cap["code"] == cap["expect"]
    planted = cap["expect"] != "0"
    badge = ("caught" if planted else "passed") if ok else "unexpected"
    cls = ("planted" if planted else "pass") if ok else "bad"
    return f"""
<details class="run" {'open' if planted else ''}>
  <summary>
    <span class="chip {cls}">{badge}</span>
    <span class="cap">{html.escape(caption)}</span>
    <span class="meta">exit {cap['code']} · {cap['took']}</span>
  </summary>
  <div class="term"><div class="prompt">$ {html.escape(cap['cmd'])}</div><pre>{html.escape(cap['body'])}</pre></div>
</details>"""

def step_html(d):
    s = json.load(open(os.path.join(d, "step.json")))
    caps = sorted(glob.glob(os.path.join(d, "*.txt")))
    runs = [(os.path.basename(p)[:-4], capture(p)) for p in caps]
    ci = json.load(open(os.path.join(d, "ci.json")))[0] if os.path.exists(os.path.join(d, "ci.json")) else None
    commit = runs[0][1]["commit"] if runs else ""
    all_ok = all(c["code"] == c["expect"] for _, c in runs) and (ci is None or ci["conclusion"] == "success")
    ci_html = f'<a href="{ci["url"]}">CI {"green" if ci["conclusion"]=="success" else ci["conclusion"]}</a>' if ci else "CI not run"
    body = "".join(run_html(n, c, s["captions"].get(n, n)) for n, c in runs)
    return f"""
<section class="step">
  <div class="stage">{html.escape(s['stage'])}</div>
  <h2><span class="id">{s['step']}</span> {html.escape(s['title'])} <span class="chip {'pass' if all_ok else 'bad'}">{'done' if all_ok else 'not done'}</span></h2>
  <p class="summary">{html.escape(s['summary'])}</p>
  <div class="proves"><span class="label">Done when</span>{html.escape(s['proves'])}</div>
  <div class="links">{ci_html} · <a href="{REPO}/commit/{commit}">commit {commit}</a> · {len(runs)} captured runs</div>
  {body}
</section>"""

steps = sorted([d for d in glob.glob(os.path.join(EV, "*")) if os.path.isdir(d)], reverse=True)
page = open(os.path.join(os.path.dirname(__file__), "template.html")).read().replace("<!--STEPS-->", "".join(step_html(d) for d in steps))
open(os.path.join(EV, "index.html"), "w").write(page)
print("wrote design/evidence/index.html with", len(steps), "steps")
