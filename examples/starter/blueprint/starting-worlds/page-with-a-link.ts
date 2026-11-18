// Journey-author file. The builder never edits it.
import { Blueprint } from "orthograph";
import claim from "../things/handle/verbs/claim.ts";
import add from "../things/link/verbs/add.ts";

export default Blueprint.startingWorld("page-with-a-link", {
  cast: { aaron: Blueprint.signedIn },
  makes: (s) => [
    s.aaron.run(claim, { name: "linkpage" }),
    s.aaron.run(add, { title: "GitHub", url: "https://github.com/aaron" }),
  ],
  gives: (s) => ({ firstLink: s.last.link }),
});
