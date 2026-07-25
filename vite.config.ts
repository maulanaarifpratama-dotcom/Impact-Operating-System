import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/react-router-dom/")) {
              return "vendor-react";
            }
            if (id.includes("/@radix-ui/")) {
              return "vendor-radix";
            }
            if (id.includes("/recharts/")) {
              return "vendor-charts";
            }
            if (id.includes("/pdfjs-dist/")) {
              return "vendor-pdf";
            }
            if (id.includes("/@azure/msal-browser/") || id.includes("/@azure/msal-react/")) {
              return "vendor-azure";
            }
            if (id.includes("/@supabase/supabase-js/") || id.includes("/@tanstack/react-query/") || id.includes("/@tanstack/query-core/")) {
              return "vendor-data";
            }
            if (id.includes("/lucide-react/")) {
              return "vendor-icons";
            }
          }
        },
      },
    },
  },
}));
