import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),

      /**
       * 🛑 Patch for DigitalPersona Core:
       * Force Vite to use ES module version instead of UMD bundle
       * which doesn't support named exports in ES module context.
       */
      "@digitalpersona/core": path.resolve(
        __dirname,
        "./node_modules/@digitalpersona/core/dist/es5/index.js"
      ),
    },
  },

  build: {
    rollupOptions: {
      external: ["WebSdk"], // optional, not strictly needed for dev
      output: {
        globals: {
          WebSdk: "WebSdk",
        },
      },
    },
  },

  optimizeDeps: {
    exclude: ["@digitalpersona/devices"], // don't pre-bundle this, let it use our alias
  },
}));
