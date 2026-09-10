import { mkdir, rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const outdir = ".project-tree-test-dist";
const outfile = `${outdir}/projectTree.test.mjs`;

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
await build({
  entryPoints: ["tests/projectTree.test.ts"],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  logLevel: "silent",
});
await import(pathToFileURL(`${process.cwd()}/${outfile}`).href);
await rm(outdir, { recursive: true, force: true });
