import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { sessionContextPlugin } from "session-context/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    cloudflare(),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    sessionContextPlugin(),
  ],
  ssr: {
    resolve: {
      conditions: ["workerd", "worker", "browser"],
      externalConditions: ["workerd", "worker"],
    },
  },
  resolve: {
    mainFields: ["browser", "module", "main"],
  },
  build: {
    outDir: "build",
    minify: true,
  },
});
