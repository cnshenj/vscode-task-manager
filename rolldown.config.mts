import { defineConfig } from "rolldown";

const production = process.env.NODE_ENV === "production";

export default defineConfig({
  input: "src/extension.ts",
  external: ["vscode"],
  platform: "node",
  resolve: {
    mainFields: ["module", "main"],
  },
  output: {
    format: "cjs",
    minify: production,
    sourcemap: !production,
    dir: "dist",
    cleanDir: true,
  },
});
