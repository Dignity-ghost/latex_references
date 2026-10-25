import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  globalIgnores([
    "main.js",
    "coverage/**",
    "esbuild.config.mjs",
    "scripts/**",
    "tests/**",
    "vitest.config.ts"
  ]),
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.mjs", "manifest.json"]
        },
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".json"]
      }
    },
    rules: {
      // Declarative settings require Obsidian 1.13; this plugin supports 1.8 and later.
      "obsidianmd/settings-tab/prefer-setting-definitions": "off"
    }
  }
]);
