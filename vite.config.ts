import { defineConfig } from "vite";

import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    target: "es2024",
    lib: {
      entry: "./src/index.ts",
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: [/^node:/, /^@modelcontextprotocol/, "zod"],
      output: {
        banner: "#!/usr/bin/env node",
      },
    },
  },
});
