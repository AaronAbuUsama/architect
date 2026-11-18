import type { Section } from "../types.ts";

const segment = (name: string) =>
  /^[a-z\d][a-z\d._-]*$/u.test(name) ? name : `~${Buffer.from(name).toString("base64url")}`;

export const link = (section: Section, name?: string) => {
  if (section === "overview") return "index.html";
  return name === undefined
    ? `${section}/index.html`
    : `${section}/${segment(name)}/index.html`;
};
