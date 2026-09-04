import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["**/node_modules/**", "**/.next/**", "e2e/**"],
    server: {
      deps: {
        // pnpm's nested node_modules layout otherwise breaks next-intl's
        // internal `next/server` import when Vite tries to externalize it.
        inline: [/next-intl/],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["app/**", "features/**", "shared/**"],
      exclude: [
        "shared/components/ui/**",
        // Vendored from the React Bits registry (WebGL background) — same
        // status as the shadcn files above: not hand-authored, not testable
        // in jsdom (no WebGL), pinned by the registry.
        "shared/components/GlassSurface.tsx",
        "**/*.d.ts",
        // Pure Next.js wiring (fonts, metadata) — no branching logic to test.
        "app/[locale]/layout.tsx",
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
