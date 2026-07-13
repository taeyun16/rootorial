import assert from "node:assert/strict";
import test from "node:test";

import {
  handleLinuxExperimentAsset,
  linuxExperimentAssetUrl,
} from "../src/features/linux-runtime/linux-assets.ts";

test("ignores requests outside the Linux experiment asset boundary", async () => {
  assert.equal(
    await handleLinuxExperimentAsset(new Request("http://localhost/favicon.svg")),
    null,
  );
});

test("rejects unknown assets and mutating methods", async () => {
  const missing = await handleLinuxExperimentAsset(
    new Request("http://localhost/api/experiments/linux-assets/not-allowed.bin"),
  );
  assert.equal(missing.status, 404);

  for (const inheritedName of ["toString", "constructor", "__proto__"]) {
    const inherited = await handleLinuxExperimentAsset(
      new Request(`http://localhost/api/experiments/linux-assets/${inheritedName}`),
    );
    assert.equal(inherited.status, 404);
  }

  const cacheBust = await handleLinuxExperimentAsset(
    new Request("http://localhost/api/experiments/linux-assets/buildroot-bzimage68.bin?nonce=1"),
  );
  assert.equal(cacheBust.status, 400);

  const post = await handleLinuxExperimentAsset(
    new Request("http://localhost/api/experiments/linux-assets/v86.wasm", { method: "POST" }),
  );
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("allow"), "GET, HEAD");
});

test("proxies an allowlisted asset without forwarding browser headers", async (context) => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ input: String(input), init });
    return new Response(new Uint8Array([0, 97, 115, 109]), {
      headers: { "content-length": "4", "content-type": "ignored/type" },
    });
  };
  context.after(() => { globalThis.fetch = originalFetch; });

  const request = new Request(
    `http://localhost${linuxExperimentAssetUrl("v86.wasm")}`,
    { headers: { referer: "https://rootorial.com/experiments/linux" } },
  );
  const response = await handleLinuxExperimentAsset(request);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/wasm");
  assert.equal(response.headers.get("content-length"), "4");
  assert.match(response.headers.get("cache-control"), /stale-while-revalidate/);
  assert.equal(response.headers.get("cross-origin-resource-policy"), "same-origin");
  assert.equal(calls.length, 1);
  assert.match(calls[0].input, /unpkg\.com\/v86@0\.5\.424\/build\/v86\.wasm$/);
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.signal, request.signal);
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [0, 97, 115, 109]);
});

test("preserves HEAD semantics and reports upstream failures as 502", async (context) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    if (init?.method === "HEAD") {
      return new Response(null, { headers: { "content-length": "131072" } });
    }
    return new Response("forbidden", { status: 403 });
  };
  context.after(() => { globalThis.fetch = originalFetch; });

  const head = await handleLinuxExperimentAsset(new Request(
    `http://localhost${linuxExperimentAssetUrl("seabios.bin")}`,
    { method: "HEAD" },
  ));
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-length"), "131072");
  assert.equal(await head.text(), "");

  const failed = await handleLinuxExperimentAsset(new Request(
    `http://localhost${linuxExperimentAssetUrl("buildroot-bzimage68.bin")}`,
  ));
  assert.equal(failed.status, 502);
  assert.match(await failed.text(), /upstream returned 403/);
});
