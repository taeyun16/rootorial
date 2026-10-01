import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import { once } from "node:events";
import test from "node:test";
import { allowPreviewRequest, createPreviewProxy } from "../scripts/private-preview-proxy.mjs";

const host = "homelab.example.ts.net";
const request = (target, extra = {}) => ({ method: "GET", target, host: `${host}:11443`, ...extra });
const id = (name, file = "/src/features/publication/publication.functions.ts?tss-serverfn-split") => Buffer.from(JSON.stringify({ file, export: `${name}_createServerFn_handler` })).toString("base64url");

test("private preview admits only learning pages, client assets, and named read functions", () => {
  for (const path of ["/", "/admin/preview/curricula", "/admin/preview/curricula/linux-systems/chapters/boot-to-shell?lang=en", "/curricula/transformer-from-zero", "/experiments/linux", "/src/routes/admin_.preview.curricula.$curriculumSlug.tsx?tsr-split=component", "/node_modules/.vite/deps/react.js?v=ab12", "/src/styles/globals.css?url", "/node_modules/katex/dist/fonts/KaTeX_Main-Regular.woff2", "/@vite/client", "/pyodide-worker.js", `/_serverFn/${id("getAdminPublicationPreview")}?payload=%7B%7D`]) {
    assert.equal(allowPreviewRequest(request(path), host), true, path);
  }
});

test("private preview rejects writes, debug/admin/data paths, encodings, traversal and alternate module queries", () => {
  for (const path of ["/__debug", "/cdn-cgi/local/explorer/api/d1/database", "/admin", "/admin/learning", "/admin/preview/curricula/../../admin", "/admin/preview/curricula/%2e%2e/%2e%2e/admin", "/%2563dn-cgi/local/explorer/api", "/%2fadmin", "/admin\\preview\\curricula", "//admin/preview/curricula", "http://localhost/admin/preview/curricula", "/src/../.env", "/src/%252e%252e/.env", "/@fs/C:/Users/taeyun/.env", "/@id/__x00__virtual:server-entry", "/.env", "/.git/config", "/wrangler.jsonc", "/src/features/admin/admin-auth.server.ts", "/src/features/publication/publication.functions.ts?tss-serverfn-split", "/src/start.ts?raw", "/src/start.ts?%72aw", "/src/start.ts?ssr", "/src/start.ts?v=ab&v=cd", "/src/start.ts.map", `/_serverFn/${id("updateContentPublication")}`, `/_serverFn/${id("getAdminPublicationPreview", "/src/../secrets.ts")}`, "/_serverFn/unknown"]) {
    assert.equal(allowPreviewRequest(request(path), host), false, path);
  }
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS", "TRACE", "CONNECT"]) assert.equal(allowPreviewRequest(request("/", { method }), host), false);
  for (const invalidHost of [host, `${host}:443`, "localhost:11444", `${host}.evil:11443`, `${host}:11443@evil`, `evil,${host}:11443`]) assert.equal(allowPreviewRequest(request("/", { host: invalidHost }), host), false);
  assert.equal(allowPreviewRequest(request("/", { origin: "https://evil.example" }), host), false);
});

test("real proxy strips credentials and forwarded hosts, denies upgrades, and does not forward blocked requests", async () => {
  const received = [];
  const backend = http.createServer((req, res) => { received.push({ path: req.url, headers: req.headers }); res.writeHead(200, { "Set-Cookie": "secret=test" }); res.end("lesson"); });
  backend.listen(0, "127.0.0.1"); await once(backend, "listening");
  const proxy = createPreviewProxy(host, backend.address().port);
  proxy.listen(0, "127.0.0.1"); await once(proxy, "listening");
  const port = proxy.address().port;
  const send = (path, headers = {}, method = "GET") => new Promise((resolve, reject) => {
    const req = http.request({ hostname: "127.0.0.1", port, path, method, headers: { host: `${host}:11443`, ...headers } }, (res) => { res.resume(); res.on("end", () => resolve(res)); });
    req.on("error", reject); req.end();
  });
  try {
    const result = await send("/admin/preview/curricula", { cookie: "secret=test", authorization: "test", "x-forwarded-host": "evil", "x-http-method-override": "POST" });
    assert.equal(result.statusCode, 200);
    assert.equal(result.headers["set-cookie"], undefined);
    assert.equal(received[0].headers.host, `127.0.0.1:${backend.address().port}`);
    for (const key of ["cookie", "authorization", "x-forwarded-host", "x-http-method-override"]) assert.equal(received[0].headers[key], undefined);
    for (const path of ["/cdn-cgi/local/explorer/api", "/admin/preview/curricula/%2e%2e/admin", "/admin/preview/curricula/../admin", "/src/start.ts?raw"]) assert.equal((await send(path)).statusCode, 403);
    assert.equal((await send("/", {}, "POST")).statusCode, 403);
    assert.equal((await send("/", { host: "localhost" })).statusCode, 403);
    assert.equal(received.length, 1);
    const reply = await new Promise((resolve) => {
      const socket = net.connect(port, "127.0.0.1", () => socket.write(`GET / HTTP/1.1\r\nHost: ${host}:11443\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n`));
      let data = ""; socket.on("data", (chunk) => { data += chunk; }); socket.on("end", () => resolve(data));
    });
    assert.match(reply, /^HTTP\/1.1 403/);
  } finally { proxy.closeAllConnections(); backend.closeAllConnections(); await Promise.all([new Promise((r) => proxy.close(r)), new Promise((r) => backend.close(r))]); }
});
