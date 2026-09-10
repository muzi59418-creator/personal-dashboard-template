import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    // Keep local development and root-domain hosts at `/`. The Pages workflow
    // supplies the repository sub-path through a non-public build variable.
    base: normalizeBasePath(env.PAGES_BASE_PATH),
    plugins: [react()],
  };
});

function normalizeBasePath(value?: string): string {
  const trimmed = value?.trim() || "/";
  if (trimmed === "/") return "/";

  const normalized = trimmed.replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}/` : "/";
}
