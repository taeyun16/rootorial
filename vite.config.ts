import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

export default defineConfig(({ mode }) => ({
  server: {
    port: 3000,
    strictPort: true,
    watch: isCodexSeatbeltSandbox
      ? { useFsEvents: false, usePolling: true }
      : undefined,
  },
  plugins: [
    cloudflare({
      viteEnvironment: { name: "ssr" },
      persistState:
        mode === "e2e" ? { path: ".wrangler/e2e-state" } : true,
    }),
    tanstackStart(),
    react(),
  ],
}));
