// Reads and writes the "Orthograph" Project through GitHub's GraphQL API (K33). `project.mjs` decides; this does.
// A user-level Project needs the token's `project` scope; `hasProjectScope` says whether it has it, never the token.
import { execFileSync } from "node:child_process";
import { PROJECT_TITLE, projectPlan } from "./project.mjs";

const graphql = (query, variables = {}) => {
  const out = execFileSync("gh", ["api", "graphql", "--input", "-"], { input: JSON.stringify({ query, variables }), encoding: "utf8", maxBuffer: 64 << 20 });
  const json = JSON.parse(out);
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join("; "));
  return json.data;
};

/** True when the signed-in token carries `project`. Reads only the scope header. */
export const hasProjectScope = () => {
  const head = execFileSync("gh", ["api", "-i", "user"], { encoding: "utf8" }).split("\r\n\r\n")[0];
  const scopes = /^x-oauth-scopes:\s*(.*)$/im.exec(head)?.[1] ?? "";
  return scopes.split(",").map((s) => s.trim()).includes("project");
};

const FIELDS = `fields(first: 50) { nodes {
  ... on ProjectV2FieldCommon { id name dataType }
  ... on ProjectV2SingleSelectField { options { id name color description } } } }`;
const VALUES = `fieldValues(first: 20) { nodes {
  ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2FieldCommon { name } } }
  ... on ProjectV2ItemFieldTextValue { text field { ... on ProjectV2FieldCommon { name } } } } }`;

/** The owner's id and the Project as `projectPlan` wants it, or null when the owner has no Project of that title. */
export const readProject = (owner, repo) => {
  const { user } = graphql(`query($login: String!) { user(login: $login) { id projectsV2(first: 50) { nodes { id title url } } } }`, { login: owner });
  const found = user.projectsV2.nodes.find((p) => p.title === PROJECT_TITLE);
  if (!found) return { ownerId: user.id, project: null };
  const { node } = graphql(`query($id: ID!) { node(id: $id) { ... on ProjectV2 { ${FIELDS} views(first: 50) { nodes { id name layout filter } } } } }`, { id: found.id });
  const items = [];
  for (let after = null; ; ) {
    const page = graphql(
      `query($id: ID!, $after: String) { node(id: $id) { ... on ProjectV2 { items(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor } nodes { id content { ... on Issue { number repository { nameWithOwner } } } ${VALUES} } } } } }`,
      { id: found.id, after },
    ).node.items;
    for (const n of page.nodes) {
      if (n.content?.repository?.nameWithOwner !== repo) continue;
      items.push({ id: n.id, number: n.content.number, values: Object.fromEntries(n.fieldValues.nodes.filter((v) => v.field).map((v) => [v.field.name, v.name ?? v.text])) });
    }
    if (!page.pageInfo.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }
  return {
    ownerId: user.id,
    url: found.url,
    project: { id: found.id, fields: node.fields.nodes.filter((f) => f.id).map((f) => ({ ...f, options: f.options ?? [] })), items, views: node.views.nodes },
  };
};

/** Applies the plan: creates the Project first when it is missing, then reads it again and plans the rest from it. */
export const applyProject = ({ owner, repo, goals, issues, log }) => {
  let read = readProject(owner, repo);
  if (!read.project) {
    const { createProjectV2 } = graphql(`mutation($o: ID!, $t: String!) { createProjectV2(input: { ownerId: $o, title: $t }) { projectV2 { id } } }`, { o: read.ownerId, t: PROJECT_TITLE });
    const { repository } = graphql(`query($o: String!, $n: String!) { repository(owner: $o, name: $n) { id } }`, { o: owner, n: repo.split("/")[1] });
    graphql(`mutation($p: ID!, $r: ID!) { linkProjectV2ToRepository(input: { projectId: $p, repositoryId: $r }) { repository { id } } }`, { p: createProjectV2.projectV2.id, r: repository.id });
    log("did createProject Orthograph, linked to the repository");
    read = readProject(owner, repo);
  }
  const pid = read.project.id;
  const fieldId = (name) => read.project.fields.find((f) => f.name === name)?.id;
  const optionId = (name, value) => read.project.fields.find((f) => f.name === name)?.options.find((o) => o.name === value)?.id;
  const itemId = new Map(read.project.items.map((i) => [i.number, i.id]));
  const nodeId = new Map(issues.map((i) => [i.number, i.nodeId]));

  // Fields first, then read again, so item values can name the options' ids.
  const plan = projectPlan({ goals, issues, project: read.project });
  for (const s of plan.filter((x) => x.do === "createField" || x.do === "updateField")) {
    const options = s.options.map(({ id, name, color, description }) => ({ ...(id ? { id } : {}), name, color, description: description ?? "" }));
    if (s.do === "createField") {
      graphql(`mutation($p: ID!, $n: String!, $d: ProjectV2CustomFieldType!, $o: [ProjectV2SingleSelectFieldOptionInput!]) {
        createProjectV2Field(input: { projectId: $p, name: $n, dataType: $d, singleSelectOptions: $o }) { clientMutationId } }`,
        { p: pid, n: s.name, d: s.dataType, o: s.dataType === "SINGLE_SELECT" ? options : null });
    } else {
      graphql(`mutation($f: ID!, $o: [ProjectV2SingleSelectFieldOptionInput!]) { updateProjectV2Field(input: { fieldId: $f, singleSelectOptions: $o }) { clientMutationId } }`,
        { f: fieldId(s.name), o: options });
    }
    log(`did ${s.do} ${s.name}`);
  }
  read = readProject(owner, repo);
  for (const s of projectPlan({ goals, issues, project: read.project }).filter((x) => x.do !== "createField" && x.do !== "updateField")) {
    if (s.do === "addItem") {
      const { addProjectV2ItemById } = graphql(`mutation($p: ID!, $c: ID!) { addProjectV2ItemById(input: { projectId: $p, contentId: $c }) { item { id } } }`, { p: pid, c: nodeId.get(s.number) });
      itemId.set(s.number, addProjectV2ItemById.item.id);
    }
    if (s.do === "setValue") {
      const value = s.field === "Model" ? { text: s.value } : { singleSelectOptionId: optionId(s.field, s.value) };
      graphql(`mutation($p: ID!, $i: ID!, $f: ID!, $v: ProjectV2FieldValue!) { updateProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f, value: $v }) { clientMutationId } }`,
        { p: pid, i: itemId.get(s.number), f: fieldId(s.field), v: value });
    }
    if (s.do === "clearValue") {
      graphql(`mutation($p: ID!, $i: ID!, $f: ID!) { clearProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f }) { clientMutationId } }`,
        { p: pid, i: itemId.get(s.number), f: fieldId(s.field) });
    }
    if (s.do === "createView") {
      const { createProjectV2View } = graphql(`mutation($p: ID!, $n: String!, $l: ProjectV2ViewLayout!) { createProjectV2View(input: { projectId: $p, name: $n, layout: $l }) { projectV2View { id } } }`, { p: pid, n: s.name, l: s.layout });
      if (s.filter) graphql(`mutation($v: ID!, $q: String!) { updateProjectV2View(input: { viewId: $v, filter: $q }) { clientMutationId } }`, { v: createProjectV2View.projectV2View.id, q: s.filter });
    }
    if (s.do === "updateView") {
      graphql(`mutation($v: ID!, $n: String!, $l: ProjectV2ViewLayout!, $q: String!) { updateProjectV2View(input: { viewId: $v, name: $n, layout: $l, filter: $q }) { clientMutationId } }`,
        { v: s.id, n: s.name, l: s.layout, q: s.filter });
    }
    log(`did ${s.do} ${s.title ?? s.name ?? ""}`);
  }
  return readProject(owner, repo).url;
};
