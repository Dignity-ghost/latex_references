# Contributing

Contributions are welcome. Preserve these project invariants:

- Never rewrite a user's Markdown merely to render or number a reference.
- Keep runtime support for desktop and mobile Obsidian.
- Do not add Node.js, Electron, native-binary, or outside-vault runtime dependencies.
- Keep network access and telemetry absent unless a future release makes them strictly opt-in and documents them before implementation.
- Add parser tests for every new syntax or edge case.
- Record copied or adapted third-party source in `THIRD_PARTY_NOTICES.md` and preserve its license notices.

Before opening a pull request, run:

```sh
npm ci
npm run check
```

`npm run check` validates release metadata and runtime portability, applies the official Obsidian ESLint rules, runs TypeScript checks and unit tests, and creates a production build.
