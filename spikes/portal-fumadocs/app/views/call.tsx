// How to call an operation, the same way in every environment: pick the environment, get its address and the exact call,
// then what comes back — the answer's shape, or one of the declared refusals.
import { Button, ButtonGroup, Card, Tabs } from "@heroui/react";
import { CodeBlock } from "@heroui-pro/react/code-block";
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
  const pre = (s: string, language = "json") => <CodeBlock><CodeBlock.Header><span>{language}</span><CodeBlock.CopyButton code={s} /></CodeBlock.Header><CodeBlock.Code code={s} language={language} /></CodeBlock>;
  return (
    <div className="my-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <ButtonGroup size="sm" variant="secondary" aria-label="Environment">{ENVS.map((x) => <Button key={x} variant={env === x ? "primary" : "secondary"} onPress={() => setEnv(x)}>{x}</Button>)}</ButtonGroup>
        <span className="text-sm text-muted">{api ? <>at <Code>https://{api}</Code></> : <>no public address: {env} {e.runs}</>}{tag && <> · CLI and SDK tagged <Code>{tag}</Code></>}</span>
      </div>
      <Tabs defaultSelectedKey="cli">
        <Tabs.ListContainer><Tabs.List aria-label="How to call">
          {["cli", "http", "sdk"].map((k) => <Tabs.Tab key={k} id={k}>{k.toUpperCase()}<Tabs.Indicator /></Tabs.Tab>)}
        </Tabs.List></Tabs.ListContainer>
        <Tabs.Panel id="cli">{pre(api ? `${tag && tag !== "latest" ? `npx ${BP.project}@${tag} ` : ""}${cli.replace(new RegExp(`^${BP.project} `), tag && tag !== "latest" ? "" : `${BP.project} `)}` : `# ${env} has no public address: call it inside a world, e.g. one \`architect dev\` starts\n${cli}`, "bash")}</Tabs.Panel>
        <Tabs.Panel id="http">{pre(`POST ${api ? `https://${api}` : ""}/${o.thing}/${o.verb}\ncontent-type: application/json${o.idempotent ? "\nidempotency-key: <key>" : ""}\n\n${body}`, "http")}</Tabs.Panel>
        <Tabs.Panel id="sdk">{pre(`const answer = yield* Sdk.${sdkThing}.${o.identifier}(${body})`, "typescript")}</Tabs.Panel>
      </Tabs>
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="gap-2"><h4 className="text-sm font-semibold">Answers</h4>{Object.keys(o.answer).length ? pre(example(o.answer)) : <Sub>nothing: success is the answer</Sub>}</Card>
        <Card className="gap-2"><h4 className="text-sm font-semibold">Or refuses with</h4>
          <div className="flex flex-col gap-1.5">{o.refusals.map((r) => <div key={r} className="flex items-baseline justify-between gap-3 text-sm"><A href={to.error(r)}>{r}</A><span className="font-mono text-xs text-muted">{errors[r]?.code}</span></div>)}</div>
        </Card>
      </div>
      <Sub>The same in every environment: the declaration is one; only the address and the published tag change.</Sub>
    </div>
  );
}
