import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { localEnv, root, statePath, viteArgs } from "../scripts/local-runtime.mjs";

test("local runtime excludes inherited identity/cloud secrets and explicit environment-file overrides", async () => {
  const keys = ["CLERK_SECRET_KEY", "CLERK_PUBLISHABLE_KEY", "ROOTORIAL_ADMIN_USER_IDS", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_ENV", "NODE_OPTIONS", "VITE_CLERK_PUBLISHABLE_KEY", "DOTENV_CONFIG_PATH"];
  const previous = keys.map((key) => process.env[key]);
  try {
    keys.forEach((key) => process.env[key] = "synthetic-test-value");
    const env = await localEnv(statePath());
    for (const key of keys.filter((key) => key !== "CLOUDFLARE_ENV")) assert.equal(env[key], undefined, key);
    assert.equal(env.CLOUDFLARE_ENV, "integration");
    assert.equal(env.CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV, "false");
    assert.equal(env.CLOUDFLARE_INCLUDE_PROCESS_ENV, "false");
  } finally {
    keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; });
  }
});

test("local state cannot point at another database directory and modes stay explicit", () => {
  assert.equal(statePath(), resolve(root, "work/local-runtime/state"));
  for (const path of [".wrangler", "work/local-runtime/../production", "../outside"]) assert.throws(() => statePath(path));
  assert.throws(() => viteArgs("3220", "production"));
  assert.throws(() => viteArgs("99999"));
});
