import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
const privatePreview = process.env.ROOTORIAL_PRIVATE_PREVIEW === "1";

export default defineConfig(({ mode }) => ({
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
      ...(privatePreview ? { inspectorPort: false, remoteBindings: false } : {}),
      viteEnvironment: { name: "ssr" },
      persistState:
        mode === "e2e" || mode === "e2e-anonymous"
          ? { path: ".wrangler/e2e-state" }
          : mode === "content-preview" ? { path: ".wrangler/rehearsal-state" } : true,
    }),
    tanstackStart(),
    react(),
  ],
}));
