# Releasing LaTeX References

This repository is prepared for Obsidian Community directory submission. The plugin ID is `latex-references`; treat it as permanent.

## Release requirements

- Use a public, dedicated GitHub repository with `README.md`, `LICENSE`, and `manifest.json` at its root.
- Keep `manifest.json`, `package.json`, and `versions.json` synchronized.
- Use a strict `x.y.z` version. The annotated Git tag and GitHub Release tag must match `manifest.json` exactly, without a leading `v`.
- Attach `main.js`, `manifest.json`, and `styles.css` as individual GitHub Release assets.
- Keep `isDesktopOnly` set to `false`; runtime source must not introduce Node.js, Electron, native binary, network, telemetry, or outside-vault dependencies.

## Prepare and verify a release

1. Update the version metadata and changelog.
2. Install exactly the locked dependencies and run all checks:

   ```sh
   npm ci
   npm audit --audit-level=high
   npm run check
   ```

3. Complete the desktop and mobile checks in [MANUAL_TEST.md](./MANUAL_TEST.md).
4. Inspect the pending changes and generated plugin files:

   ```sh
   git status --short
   git diff --check
   git diff
   ls -lh main.js manifest.json styles.css
   ```

## Commit and create the 1.0.0 release

Commit the verified repository state before creating the tag:

```sh
git add .
git diff --cached --check
git diff --cached
git commit -m "Release 1.0.0"
git push origin main
git tag -a 1.0.0 -m "1.0.0"
git push origin 1.0.0
```

The tag starts the release workflow. It rebuilds the plugin, runs all checks, creates build provenance attestations, and opens a draft GitHub Release containing the three required assets. Review the generated notes and assets, then publish the draft.

If GitHub Actions cannot create the draft, open **Settings → Actions → General** in the repository and grant workflows read and write permissions.

## Submit the initial release to Obsidian

After the public `1.0.0` GitHub Release exists:

1. Sign in at <https://community.obsidian.md> with the maintainer's Obsidian account.
2. Link the GitHub account that owns the repository.
3. Add the repository as a new plugin in the Community directory.
4. Review the automated findings, accept the developer policies, and submit the listing.

The Community directory reads `manifest.json` from the HEAD of the default branch and downloads plugin assets from the GitHub Release whose tag matches its version. If review feedback requires source changes, increment the version and publish a new matching release before resolving the finding.

Official references:

- [Submit your plugin](https://docs.obsidian.md/plugins/releasing/submit-plugin)
- [Release your plugin with GitHub Actions](https://github.com/obsidianmd/obsidian-developer-docs/blob/main/en/Plugins/Releasing/Release%20your%20plugin%20with%20GitHub%20Actions.md)
- [Obsidian community releases](https://github.com/obsidianmd/obsidian-releases)
