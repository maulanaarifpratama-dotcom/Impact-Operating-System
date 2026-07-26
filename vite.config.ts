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
          // Rollup's CJS interop helpers live in a virtual module outside
          // node_modules. Unassigned, they get parked in whichever vendor chunk
          // Rollup picks (recharts), and every entry that needs an interop
          // helper then has to pull that whole chunk in. Pin them beside React,
          // which every route loads anyway.
          if (id.includes("commonjsHelpers")) {
            return "vendor-react";
          }
          if (id.includes("node_modules")) {
            // React core has to be its own chunk. Left unassigned, Rollup folds
            // it into the first manual chunk that references it — recharts —
            // which then forces every route, landing page included, to download
            // the whole 500 kB chart library just to boot React.
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/react-router/") ||
              id.includes("/react-router-dom/") ||
              id.includes("/scheduler/") ||
              id.includes("/react-is/")
            ) {
              return "vendor-react";
            }
            if (id.includes("/pdfjs-dist/")) {
              return "vendor-pdf";
            }
            if (id.includes("/@radix-ui/")) {
              return "vendor-radix";
            }
            // recharts/d3 are deliberately NOT given a manual chunk. Only
            // SROICalculator imports them, and it is lazy-loaded, so Rollup
            // bundles them into that route's own chunk. Forcing a shared
            // "vendor-charts" chunk instead made the entry import it for a
            // single shared helper, pushing ~350 kB onto the landing page.
            if (
              id.includes("/@supabase/") ||
              id.includes("/@tanstack/") ||
              id.includes("/@azure/")
            ) {
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
