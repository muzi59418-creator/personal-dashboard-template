import { mkdir, rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const outdir = ".dashboard-test-dist";
const outfile = `${outdir}/dashboardHome.test.mjs`;

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
await build({
  entryPoints: ["tests/dashboardHome.test.ts"],
  outfile,
  bundle: true,
  packages: "external",
  platform: "node",
  format: "esm",
  target: "node20",
  logLevel: "silent",
});
await import(pathToFileURL(`${process.cwd()}/${outfile}`).href);
await rm(outdir, { recursive: true, force: true });
