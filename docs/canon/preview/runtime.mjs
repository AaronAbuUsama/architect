// A JSX runtime that renders straight to an HTML string, for MDX's `evaluate` and the preview's components. React is
// left out on purpose: adding it to the workspace changes how better-auth resolves its optional React peer.
export const Fragment = Symbol("Fragment");

/** An element: what JSX and `h` both make. Nothing renders until `render`. */
export const jsx = (type, props) => ({ type, props: props ?? {} });
export const jsxs = jsx;
export const h = (type, props, ...children) => jsx(type, { ...props, children: children.length === 1 ? children[0] : children });

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const NAMES = { className: "class", htmlFor: "for", autoPlay: "autoplay", playsInline: "playsinline" };
const css = (style) => Object.entries(style).map(([k, v]) => `${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${v}`).join(";");

const attributes = (props) =>
  Object.entries(props)
    .filter(([k, v]) => k !== "children" && k !== "key" && k !== "dangerouslySetInnerHTML" && v !== false && v != null)
    .map(([k, v]) => {
      const name = NAMES[k] ?? k;
      if (v === true) return ` ${name}`;
      const value = k === "style" && typeof v === "object" ? css(v) : Array.isArray(v) ? v.join(" ") : v;
      return ` ${name}="${esc(value).replace(/"/g, "&quot;")}"`;
    })
    .join("");

/** The HTML for anything a component or MDX can return. */
export const render = (node) => {
  if (node == null || node === false || node === true) return "";
  if (typeof node === "string" || typeof node === "number") return esc(node);
  if (Array.isArray(node)) return node.map(render).join("");
  const { type, props } = node;
  if (type === Fragment) return render(props.children);
  if (typeof type === "function") return render(type(props));
  const inner = props.dangerouslySetInnerHTML ? props.dangerouslySetInnerHTML.__html : render(props.children);
  return VOID.has(type) ? `<${type}${attributes(props)}>` : `<${type}${attributes(props)}>${inner}</${type}>`;
};
