import { threeMinifier } from "@yushijinhun/three-minifier-rollup";
import { watch } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  root: path.resolve(__dirname, "src"),
  plugins: [{ ...threeMinifier(), enforce: "pre" }],
  resolve: {
    alias: {
      three: "three",
      "@": path.resolve(__dirname, "src"),
    },
  },
  optimizeDeps: {
    include: ["three", "three-viewport-gizmo"],
  },
  server: {
    watch: {
      include: ["src/**/*.js"],
      usePolling: true,
      interval: 1500,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
        },
      },
      treeshake: {
        moduleSideEffects: false,
      },
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["../**/*.test.js"],
  },
};
