import http from "node:http";

const readFunctions = {
  publication: ["getPublicPublicationCatalog", "getLocalContentPreviewCatalog", "getPublicCurriculumPublication", "getPublicChapterPublication", "getAdminPublicationPreview"],
  "local-learning": ["getLocalLearningMode"],
};
const allowedFunctions = new Set(Object.entries(readFunctions).flatMap(([file, names]) => names.map((name) =>
  Buffer.from(JSON.stringify({ file: `/src/features/publication/${file}.functions.ts?tss-serverfn-split`, export: `${name}_createServerFn_handler` })).toString("base64url"))));
for (const name of ["getPlatformReach", "getCurriculumReach"]) allowedFunctions.add(Buffer.from(JSON.stringify({
  file: "/src/features/learning-analytics/learning-analytics.functions.ts?tss-serverfn-split", export: `${name}_createServerFn_handler`,
})).toString("base64url"));

export function previewOrigin(host) {
  if (!/^[a-z0-9][a-z0-9-]*\.[a-z0-9-]+\.ts\.net$/.test(host)) throw new Error("An exact Tailscale DNS hostname is required");
  return `https://${host}:11443`;
}

function allowedQuery(query, kind) {
  const seen = new Set();
  for (const [key, value] of query) {
    if (seen.has(key)) return false;
    seen.add(key);
    if (kind === "page" && key === "lang" && /^(ko|en)$/.test(value)) continue;
    if (kind === "function" && key === "payload" && value.length <= 12_000) continue;
    if (kind === "style" && key === "routes" && /^[a-zA-Z0-9_/$,.-]+$/.test(value)) continue;
    if (kind === "asset") {
      if (key === "v" && /^[a-f0-9]+$/.test(value)) continue;
      if (key === "t" && /^\d+$/.test(value)) continue;
      if (["url", "import", "direct"].includes(key) && value === "") continue;
      if (key === "tsr-split" && /^(component|loader|pendingComponent|errorComponent|notFoundComponent)$/.test(value)) continue;
      if (key === "tsr-shared" && value === "1") continue;
    }
    return false;
  }
  return true;
}

/** Check the raw target before URL parsing can normalize traversal or backslashes. */
export function allowPreviewRequest({ method, target, host, origin }, expectedHost) {
  if (!["GET", "HEAD"].includes(method) || host !== `${expectedHost}:11443`) return false;
  if (origin && origin !== previewOrigin(expectedHost)) return false;
  if (typeof target !== "string" || target.length > 16_384 || !target.startsWith("/") || target.startsWith("//")) return false;
  if (/[\\\x00-\x20\x7f#]/.test(target)) return false;
  const path = target.split("?", 1)[0];
  // All app paths use literal ASCII. Reject every encoded path, including double encoding.
  if (path.includes("%") || path.includes("//") || path.split("/").some((part) => part === "." || part === "..")) return false;
  const url = new URL(target, "http://localhost");
  let kind;
  if (/^\/_serverFn\/[A-Za-z0-9_-]+$/.test(path)) {
    if (!allowedFunctions.has(path.slice("/_serverFn/".length))) return false;
    kind = "function";
  } else if (path === "/" || /^\/(?:admin\/preview\/)?curricula(?:\/[a-z0-9-]+(?:\/chapters\/[a-z0-9-]+)?)?\/?$/.test(path)
    || path === "/chapters/vectors" || path === "/experiments/linux") {
    kind = "page";
  } else if (path === "/@tanstack-start/styles.css") {
    kind = "style";
  } else if (["/@id/virtual:tanstack-start-dev-client-entry", "/@react-refresh", "/@vite/client", "/favicon.svg", "/pyodide-worker.js"].includes(path)) {
    kind = "asset";
  } else if (/^\/illustrations\/[a-zA-Z0-9_-]+\.(webp|png|svg)$/.test(path)) {
    kind = "asset";
  } else if (/^\/(src|node_modules)\/[a-zA-Z0-9_@$/.-]+\.(tsx?|m?js|css|woff2?|ttf|svg|png|webp|wasm)$/.test(path)) {
    if (path.split("/").some((part) => part.startsWith(".") && part !== ".vite")) return false;
    if (/\.(server|test|spec)\.[^.]+$/.test(path)) return false;
    kind = "asset";
  } else return false;
  return allowedQuery(url.searchParams, kind);
}

/** Bind only to loopback; Tailscale Serve supplies the private HTTPS listener. */
export function createPreviewProxy(host, upstreamPort = 3000) {
  previewOrigin(host);
  const server = http.createServer((req, res) => {
    const allowed = allowPreviewRequest({ method: req.method, target: req.url, host: req.headers.host, origin: req.headers.origin }, host);
    if (!allowed) {
      res.writeHead(403, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
      res.end("This route is not available in the private learning preview.");
      return;
    }
    // No cookies, credentials, forwarded hosts, or method override headers cross this boundary.
    const headers = { host: `127.0.0.1:${upstreamPort}` };
    for (const name of ["accept", "accept-language", "x-tsr-serverfn"]) {
      if (req.headers[name]) headers[name] = req.headers[name];
    }
    const upstream = http.request({ hostname: "127.0.0.1", port: upstreamPort, path: req.url, method: req.method, headers }, (response) => {
      const responseHeaders = { ...response.headers, "cache-control": "no-store", "x-robots-tag": "noindex, nofollow", "referrer-policy": "same-origin" };
      for (const name of ["set-cookie", "connection", "transfer-encoding", "access-control-allow-origin", "access-control-allow-credentials"]) delete responseHeaders[name];
      if (responseHeaders.location) {
        const location = new URL(responseHeaders.location, `http://127.0.0.1:${upstreamPort}`);
        if (location.hostname === "127.0.0.1" || location.hostname === "localhost") responseHeaders.location = `${location.pathname}${location.search}${location.hash}`;
      }
      res.writeHead(response.statusCode ?? 502, responseHeaders);
      response.pipe(res);
    });
    upstream.setTimeout(120_000, () => upstream.destroy(new Error("Upstream timeout")));
    upstream.on("error", () => { if (!res.headersSent) res.writeHead(502); res.end("Local learning server unavailable."); });
    res.on("close", () => upstream.destroy());
    upstream.end();
  });
  server.on("upgrade", (_req, socket) => socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n"));
  server.on("connect", (_req, socket) => socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n"));
  return server;
}
