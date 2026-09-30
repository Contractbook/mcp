// Packs the normal `pnpm build` output into build/contractbook.mcpb, together
// with the production dependencies, since users have no node_modules.
// Run via `pnpm build:mcpb`.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const MCPB_CLI = "@anthropic-ai/mcpb@2.1.2";
const BUNDLE_DIR = "build/mcpb";
const INSTALL_FILES = ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"];

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

// Installs the production dependencies in their own directory so the project's
// node_modules is untouched. A hoisted layout avoids symlinks, which do not
// survive the zip everywhere.
rmSync(BUNDLE_DIR, { recursive: true, force: true });
mkdirSync(`${BUNDLE_DIR}/dist`, { recursive: true });
cpSync("dist/index.js", `${BUNDLE_DIR}/dist/index.js`);
for (const file of INSTALL_FILES) {
  cpSync(file, `${BUNDLE_DIR}/${file}`);
}
execFileSync(
  pnpm,
  ["install", "--prod", "--frozen-lockfile", "--ignore-scripts", "--config.node-linker=hoisted"],
  { cwd: BUNDLE_DIR, stdio: "inherit" },
);
// package.json stays: it marks dist/index.js as an ES module.
rmSync(`${BUNDLE_DIR}/pnpm-lock.yaml`);
rmSync(`${BUNDLE_DIR}/pnpm-workspace.yaml`);

// Fields that package.json already has are taken from it, not repeated.
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const manifest = JSON.parse(readFileSync("mcpb/manifest.json", "utf8"));
const repositoryUrl = pkg.repository.url.replace(/^git\+/, "").replace(/\.git$/, "");
Object.assign(manifest, {
  version: pkg.version,
  license: pkg.license,
  keywords: pkg.keywords,
  repository: { type: "git", url: repositoryUrl },
  homepage: repositoryUrl,
});
manifest.compatibility.runtimes = { node: pkg.engines.node };
writeFileSync(`${BUNDLE_DIR}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);

execFileSync(npx, ["-y", MCPB_CLI, "pack", BUNDLE_DIR, "build/contractbook.mcpb"], {
  stdio: "inherit",
});
