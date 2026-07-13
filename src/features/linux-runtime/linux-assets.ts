const V86_VERSION = "0.5.424";
const V86_COMMIT = "2f1346b";
const ASSET_PREFIX = "/api/experiments/linux-assets/";

const upstreamAssets = Object.freeze({
  "v86.wasm": `https://unpkg.com/v86@${V86_VERSION}/build/v86.wasm`,
  "v86-fallback.wasm": `https://unpkg.com/v86@${V86_VERSION}/build/v86-fallback.wasm`,
  "seabios.bin": `https://raw.githubusercontent.com/copy/v86/${V86_COMMIT}/bios/seabios.bin`,
  "vgabios.bin": `https://raw.githubusercontent.com/copy/v86/${V86_COMMIT}/bios/vgabios.bin`,
  "buildroot-bzimage68.bin": "https://i.copy.sh/buildroot-bzimage68.bin",
});

export const LINUX_EXPERIMENT_ASSET_BASE = ASSET_PREFIX;

type LinuxExperimentAssetName = keyof typeof upstreamAssets;

export function linuxExperimentAssetUrl(assetName: LinuxExperimentAssetName) {
  return `${ASSET_PREFIX}${assetName}`;
}

export async function handleLinuxExperimentAsset(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(ASSET_PREFIX)) return null;
  if (url.search) {
    return new Response("Linux experiment assets do not accept query parameters", {
      status: 400,
    });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { allow: "GET, HEAD" },
    });
  }

  const assetName = url.pathname.slice(ASSET_PREFIX.length) as LinuxExperimentAssetName;
  if (!Object.hasOwn(upstreamAssets, assetName)) {
    return new Response("Linux experiment asset not found", { status: 404 });
  }
  const upstreamUrl = upstreamAssets[assetName];

  try {
    // Do not forward browser headers. i.copy.sh rejects third-party Referer values,
    // while the server-to-server request is accepted and keeps the lab same-origin.
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      signal: request.signal,
    });
    if (!upstream.ok) {
      return new Response(`Linux experiment asset upstream returned ${upstream.status}`, {
        status: 502,
      });
    }

    const headers = new Headers();
    headers.set("cache-control", "public, max-age=86400, stale-while-revalidate=604800");
    headers.set("cross-origin-resource-policy", "same-origin");
    headers.set(
      "content-type",
      assetName.endsWith(".wasm") ? "application/wasm" : "application/octet-stream",
    );
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("content-length", contentLength);

    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Failed to proxy Linux experiment asset", assetName, error);
    return new Response("Linux experiment asset is temporarily unavailable", { status: 502 });
  }
}
