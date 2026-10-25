import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const versions = JSON.parse(await readFile("versions.json", "utf8"));
const githubRef = process.env.GITHUB_REF;
const githubRefName = process.env.GITHUB_REF_NAME;
const isReleaseTag =
  process.env.GITHUB_REF_TYPE === "tag" || githubRef?.startsWith("refs/tags/");
const tag = isReleaseTag
  ? githubRefName ?? githubRef?.slice("refs/tags/".length)
  : undefined;

const errors = [];
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
  errors.push("manifest version must use x.y.z semantic versioning");
}
if (manifest.version !== packageJson.version) {
  errors.push("manifest.json and package.json versions differ");
}
if (manifest.author !== "dignifiedghost" || packageJson.author !== manifest.author) {
  errors.push("manifest.json and package.json must identify dignifiedghost as the author");
}
if (
  typeof manifest.description !== "string" ||
  manifest.description.length > 250 ||
  !manifest.description.endsWith(".")
) {
  errors.push("manifest description must be at most 250 characters and end with a period");
}
if (manifest.id.includes("obsidian")) {
  errors.push("manifest id must not contain obsidian");
}
if (versions[manifest.version] !== manifest.minAppVersion) {
  errors.push("versions.json does not map this version to minAppVersion");
}
if (tag && tag !== manifest.version) {
  errors.push(`release tag ${tag} does not match manifest version ${manifest.version}`);
}
if (manifest.isDesktopOnly !== false) {
  errors.push("isDesktopOnly must remain false for the cross-platform plugin");
}

if (errors.length > 0) {
  for (const error of errors) console.error(`Release check: ${error}`);
  process.exitCode = 1;
}
