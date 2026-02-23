import { threeMinifier } from "@yushijinhun/three-minifier-rollup";

export default {
  plugins: [{ ...threeMinifier(), enforce: "pre" }],
  resolve: {
    alias: {
      three: "three",
    },
  },
  optimizeDeps: {
    include: ["three-viewport-gizmo"],
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
};
