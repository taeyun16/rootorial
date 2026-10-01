import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { createPreviewProxy, previewOrigin } from "./private-preview-proxy.mjs";

const host = process.argv[2];
const origin = previewOrigin(host);
const root = fileURLToPath(new URL("../", import.meta.url));
const vite = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "dev", "--host", "127.0.0.1", "--port", "3000", "--mode", "content-preview"], {
  cwd: root, stdio: "inherit", windowsHide: true,
  env: { ...process.env, ROOTORIAL_PRIVATE_PREVIEW: "1", CLERK_PUBLISHABLE_KEY: "", CLERK_SECRET_KEY: "", ROOTORIAL_ADMIN_USER_IDS: "" },
});
const proxy = createPreviewProxy(host);
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  proxy.close();
  vite.kill();
  process.exitCode = code;
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
vite.on("exit", (code) => { if (!closing) stop(code || 1); });
proxy.on("error", (error) => { console.error(error.message); stop(1); });
let ready = false;
for (let attempt = 0; attempt < 120 && !closing; attempt++) {
  try {
    const result = await fetch("http://127.0.0.1:3000/admin/preview/curricula", { signal: AbortSignal.timeout(2000) });
    const html = await result.text();
    if (result.ok && html.includes("implementedChapters:32")) { ready = true; break; }
  } catch { /* Vite is still starting. */ }
  await delay(500);
}
if (!ready) { console.error("Local content preview did not become ready"); stop(1); }
else if (!closing) proxy.listen(11444, "127.0.0.1", () => console.log(`Private preview ready for Tailscale Serve at ${origin}/admin/preview/curricula`));
