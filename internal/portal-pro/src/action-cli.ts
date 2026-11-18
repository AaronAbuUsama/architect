export {};

const [name = "list", input = "{}"] = process.argv.slice(2);
const port = process.env["PORTAL_PORT"] ?? "45679";
if (!/^\d+$/u.test(port) || Number(port) < 1 || Number(port) > 65535) {
  console.error("PORTAL_PORT must be a local TCP port number.");
  process.exit(1);
}
const endpoint = `http://127.0.0.1:${port}/__portal/agent/actions`;
const response = await fetch(name === "list" ? endpoint : `${endpoint}/${encodeURIComponent(name)}`, name === "list" ? {} : {
  method: "POST", headers: { "Content-Type": "application/json" }, body: input,
});
console.log(JSON.stringify(await response.json(), null, 2));
if (!response.ok) process.exitCode = 1;
