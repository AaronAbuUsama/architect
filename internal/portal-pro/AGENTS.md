# Portal agent guide

This portal reads an Orthograph blueprint and its captured local proof and trace evidence.

- Run `npm run action -- list` for action names, descriptions and input schemas.
- Use `view-screen` for requests about “this operation” or “this trace.” Use the returned tab ID with `navigate`.
- Use `list-pages` and `read-page` for the document tree and author notes. The workspace editor owns note saves.
- Use `read-operation`, `read-calls`, `read-proof`, and `read-trace` for evidence. Keep the environment scope the user selected.
- Use `list-extension-slots` and `list-extensions` before adding a widget. Each repo extension declares its slots
  and allowed actions in `extension.json`. Inside the sandbox, use `window.slotContext` and `appAction(name, input)`.
- Author new feature actions with `defineAction` and register them in `vite.config.ts`. The local action host
  only offers portal evidence and navigation. Domain writes belong to the blueprint's own operation and SDK.
