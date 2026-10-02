import { spawn } from "node:child_process";
import { mkdir, readdir } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const fixtureConfig = "tests/runtime/wrangler.fixture.json";
export const appConfig = "tests/runtime/wrangler.app.json";
export const wrangler = "node_modules/wrangler/bin/wrangler.js";
export function statePath(value = "work/local-runtime/state") {
  const path = resolve(root, value);
  const rel = relative(resolve(root, "work/local-runtime"), path);
  if (rel.startsWith("..") || isAbsolute(rel)) throw Error("State must be inside work/local-runtime");
  return path;
}
export async function localEnv(state) {
  // Fail closed if developers add secret files next to our dedicated configs.
  for (const name of await readdir(resolve(root, "tests/runtime"))) {
    if (name.startsWith(".env") || name.startsWith(".dev.vars")) throw Error("Remove environment/secret files from tests/runtime before local integration");
  }
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (/^(PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|TMPDIR|LANG|LC_.*|HTTP_PROXY|HTTPS_PROXY|ALL_PROXY|NO_PROXY|NODE_EXTRA_CA_CERTS|SSL_CERT_FILE|PLAYWRIGHT_BROWSERS_PATH)$/i.test(key)) env[key] = value;
  }
  const configHome = resolve(root, "work/local-runtime/config");
  await mkdir(configHome, { recursive: true });
  return { ...env, XDG_CONFIG_HOME: configHome, CI: "1", WRANGLER_SEND_METRICS: "false", CLOUDFLARE_ENV: "integration", CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false", CLOUDFLARE_INCLUDE_PROCESS_ENV: "false", ROOTORIAL_LOCAL_RUNTIME: "1", ROOTORIAL_LOCAL_STATE: state, ROOTORIAL_PRIVATE_PREVIEW: "1" };
}
export async function launch(args, state, options = {}) {
  return spawn(process.execPath, args, { cwd: root, env: await localEnv(state), windowsHide: true, stdio: "inherit", ...options });
}
export function finished(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0 ? resolve() : reject(Error(`Local command exited ${code ?? signal}`)));
  });
}
export async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const done = new Promise((resolve) => child.once("exit", resolve));
  if (process.platform === "win32") {
    // Kill only this launcher's process tree, including Wrangler's workerd child.
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    await finished(killer);
    await done;
  } else {
    child.kill("SIGTERM");
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    await done;
    clearTimeout(timer);
  }
}
export function migrationArgs(state) {
  return [wrangler, "d1", "migrations", "apply", "DB", "--local", "--config", appConfig, "--env", "integration", "--persist-to", state];
}
export function viteArgs(port = "3220", mode = "content-preview") {
  if (!["content-preview", "e2e-anonymous"].includes(mode) || !/^\d{4,5}$/.test(port) || Number(port) > 65535) throw Error("Invalid local server mode/port");
  return ["node_modules/vite/bin/vite.js", "dev", "--host", "127.0.0.1", "--port", port, "--mode", mode];
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, ...args] = process.argv.slice(2);
  const state = statePath(process.env.ROOTORIAL_LOCAL_STATE);
  let command;
  if (action === "migrate") command = migrationArgs(state);
  else if (action === "serve" && args.length <= 2) command = viteArgs(...args);
  else if (action === "query" && args.length === 1) command = [wrangler, "d1", "execute", "DB", "--local", "--config", appConfig, "--env", "integration", "--persist-to", state, "--command", args[0], "--json"];
  else throw Error('Usage: npm run local:runtime -- migrate|serve|query "SQL"');
  const child = await launch(command, state);
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { void stopChild(child); });
  await finished(child);
}
