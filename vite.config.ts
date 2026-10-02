import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
const privatePreview = process.env.ROOTORIAL_PRIVATE_PREVIEW === "1";
const localRuntime = process.env.ROOTORIAL_LOCAL_RUNTIME === "1";

export default defineConfig(({ mode, command }) => {
  if (localRuntime && (command !== "serve" || !["content-preview", "e2e-anonymous"].includes(mode)
      || process.env.CLOUDFLARE_ENV !== "integration" || !process.env.ROOTORIAL_LOCAL_STATE)) {
    throw new Error("Use npm run local:runtime for isolated development; it is never a production build mode.");
  }
  return {
    ...(localRuntime ? { envDir: "tests/runtime", cacheDir: `work/local-runtime/vite-${mode}` } : {}),
    server: {
      port: 3000,
      strictPort: true,
      hmr: privatePreview ? false : undefined,
      watch: isCodexSeatbeltSandbox
        ? { useFsEvents: false, usePolling: true }
        : undefined,
    },
    plugins: [
      cloudflare({
        ...(localRuntime ? { configPath: "tests/runtime/wrangler.app.json" } : {}),
        ...(privatePreview || localRuntime ? { inspectorPort: false, remoteBindings: false } : {}),
        viteEnvironment: { name: "ssr" },
        persistState:
          localRuntime ? { path: process.env.ROOTORIAL_LOCAL_STATE! } : mode === "e2e" || mode === "e2e-anonymous"
            ? { path: ".wrangler/e2e-state" }
            : mode === "content-preview" ? { path: ".wrangler/rehearsal-state" } : true,
      }),
      tanstackStart(),
      react(),
    ],
  };
});
