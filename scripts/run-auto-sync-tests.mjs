import { mkdir, rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const outdir = ".auto-sync-test-dist";
const outfile = `${outdir}/autoCloudSync.test.mjs`;

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
await build({
  entryPoints: ["tests/autoCloudSync.test.ts"],
  outfile,
  bundle: true,
  packages: "external",
  define: { "import.meta.env": "{}" },
  platform: "node",
  format: "esm",
  target: "node20",
  logLevel: "silent",
});
await import(pathToFileURL(`${process.cwd()}/${outfile}`).href);
await rm(outdir, { recursive: true, force: true });
