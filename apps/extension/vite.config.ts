import { crx } from "@crxjs/vite-plugin";
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, searchForWorkspaceRoot } from "vite";

import manifest from "./manifest.json";

export default defineConfig({
  cacheDir: "../../node_modules/.vite/extension",

  server: {
    port: 4200,
    host: "localhost",
    fs: { allow: [searchForWorkspaceRoot(process.cwd())] },
    watch: {
      ignored: ["**/node_modules/**", "**/.git/**"],
    },
  },

  preview: {
    port: 4300,
    host: "localhost",
  },

  plugins: [
    // Custom plugin to fix @crxjs/vite-plugin compatibility with Nx/Vite 5
    {
      name: "fix-crx-watch",
      enforce: "pre",
      configResolved(config) {
        if (config.server && config.server.watch === false) {
          config.server.watch = { ignored: [] };
        }
      },
    },
    react(),
    nxViteTsPaths(),
    crx({ manifest }),
  ],

  build: {
    emptyOutDir: true,
    outDir: "../../dist/apps/extension",
    reportCompressedSize: true,
    commonjsOptions: { transformMixedEsModules: true },
  },
});
