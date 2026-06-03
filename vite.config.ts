import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@types": path.resolve(__dirname, "./src/types"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@context": path.resolve(__dirname, "./src/context"),
    },
  },
  server: {
    port: 3000,
    open: false,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "markdown-core": ["react-markdown", "remark-gfm", "rehype-raw", "rehype-sanitize"],
          "math-vendor": ["remark-math", "rehype-katex", "katex"],
          "highlight-vendor": ["react-syntax-highlighter"],
        },
      },
    },
  },
});
