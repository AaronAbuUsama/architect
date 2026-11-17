// How to call an operation, the same way in every environment: pick the environment, get its address and the exact call,
// then what comes back — the answer's shape, or one of the declared refusals.
import { Button, ButtonGroup } from "@heroui/react";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { useState } from "react";
import { ENVS } from "../blueprint/evidence.ts";
import { BP, errors, M, typeText, type Fields } from "../blueprint/model.ts";
import { A, Code, Sub, to } from "./status.tsx";

const example = (fields: Fields) => JSON.stringify(Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, `<${f.named ?? f.ref ?? typeText(f.value)}>`])), null, 2);

export function HowToCall({ op }: { op: string }) {
  const o = M.operations[op]!, [env, setEnv] = useState<string>("production");
  const e = M.environments[env]!, api = e.deploy["server"]?.domain, tag = e.publish["cli"]?.[0]?.tag ?? e.publish["sdk"]?.[0]?.tag;
  const cli = /```sh\n(.*)\n```/.exec(BP.docs[`${o.thing}/${o.verb}.md`] ?? "")?.[1] ?? "";
  const sdkThing = o.thing.replace(/-(\w)/g, (_, c: string) => c.toUpperCase()), body = example(o.payload);
  const pre = (s: string) => <pre className="overflow-x-auto"><code>{s}</code></pre>;
  return (
    <div className="not-prose my-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <ButtonGroup size="sm" variant="secondary" aria-label="Environment">{ENVS.map((x) => <Button key={x} variant={env === x ? "primary" : "secondary"} onPress={() => setEnv(x)}>{x}</Button>)}</ButtonGroup>
        <span className="text-sm text-fd-muted-foreground">{api ? <>at <Code>https://{api}</Code></> : <>no public address: {env} {e.runs}</>}{tag && <> · CLI and SDK tagged <Code>{tag}</Code></>}</span>
      </div>
      <Tabs items={["CLI", "HTTP", "SDK"]}>
        <Tab value="CLI">{pre(api ? `${tag && tag !== "latest" ? `npx ${BP.project}@${tag} ` : ""}${cli.replace(new RegExp(`^${BP.project} `), tag && tag !== "latest" ? "" : `${BP.project} `)}` : `architect prove --env ${env}   # ${env} is only reached through its worlds`)}</Tab>
        <Tab value="HTTP">{pre(`POST ${api ? `https://${api}` : ""}/${o.thing}/${o.verb}\ncontent-type: application/json${o.idempotent ? "\nidempotency-key: <key>" : ""}\n\n${body}`)}</Tab>
        <Tab value="SDK">{pre(`const answer = yield* Sdk.${sdkThing}.${o.identifier}(${body})`)}</Tab>
      </Tabs>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-fd-border bg-fd-card p-4"><div className="mb-2 text-sm font-semibold">Answers</div>{Object.keys(o.answer).length ? pre(example(o.answer)) : <Sub>nothing: success is the answer</Sub>}</div>
        <div className="rounded-xl border border-fd-border bg-fd-card p-4"><div className="mb-2 text-sm font-semibold">Or refuses with</div>
          <div className="flex flex-col gap-1.5">{o.refusals.map((r) => <div key={r} className="flex items-baseline justify-between gap-3 text-sm"><A href={to.error(r)}>{r}</A><span className="font-mono text-xs text-fd-muted-foreground">{errors[r]?.code}</span></div>)}</div>
        </div>
      </div>
      <Sub>The same in every environment: the declaration is one; only the address and the published tag change.</Sub>
    </div>
  );
}
