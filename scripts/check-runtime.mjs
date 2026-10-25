import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)));
    else if (entry.isFile() && entry.name.endsWith(".ts")) files.push(path);
  }
  return files;
}

const forbidden = [
  { name: "Node.js or Electron import", pattern: /from\s+["'](?:node:|fs(?:\/|["'])|path(?:\/|["'])|electron["'])/u },
  { name: "CommonJS runtime loading", pattern: /\brequire\s*\(/u },
  { name: "network request", pattern: /\b(?:fetch|requestUrl|XMLHttpRequest|WebSocket)\s*\(/u },
  { name: "dynamic code execution", pattern: /\b(?:eval|Function)\s*\(/u }
];

const errors = [];
for (const file of await sourceFiles("src")) {
  const source = await readFile(file, "utf8");
  for (const rule of forbidden) {
    if (rule.pattern.test(source)) errors.push(`${file}: ${rule.name}`);
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`Runtime portability check: ${error}`);
  process.exitCode = 1;
}
