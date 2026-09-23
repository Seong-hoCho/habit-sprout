import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

// GitHub Pages: https://seong-hocho.github.io/habit-sprout/
// 대시보드(daily-dashboard.html)와 같은 출처라서 localStorage를 공유한다.
export default defineConfig({
  base: "/habit-sprout/",
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "client", "src") } },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
  },
  test: { root: path.resolve(import.meta.dirname), include: ["client/src/**/*.test.ts"] },
});
