// Names from what was typed: `allowance` is the thing's folder, `Allowance` its export, `all` its id prefix.

export const pascal = (s: string) => s.split(/[-_ ]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
export const kebab = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** A thing's folder name: lower case words joined by dashes, as the compiler maps them. */
export const isThingName = (s: string) => /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(s);

/** Three letters for its ids: the first three of the name's letters. Edit it freely; ids carry it. */
export const prefixOf = (thing: string) => thing.replace(/[^a-z]/g, "").slice(0, 3).padEnd(3, "x");

/** "an allowance", "a purse": for the sentences in a scaffold. */
export const article = (thing: string) => `${/^[aeiou]/.test(thing) ? "an" : "a"} ${thing.replace(/-/g, " ")}`;
