# Changelog

## 0.1.3

- Preserve native Obsidian behavior with explicit no-op paths for notes and math that contain no supported LaTeX commands.
- Index bibliography entries only from vault-local `.bib` files; fenced BibTeX in Markdown remains ordinary code.
- Parse regular `figure`/`figure*` environments and preview common `graphicx` syntax through Obsidian's native Markdown renderer without changing the source.
- Keep structured-reference navigation from moving the editor cursor into a rendered equation, heading, or figure.
- Navigate unmapped citations to their exact `.bib` entries and normalize configured bibliography paths across platforms.

## 0.1.2

- Number equations only when `\label` is inside an explicit numbered LaTeX equation environment.
- Number figures only when `\label` is inside a `figure` or `figure*` environment; native Markdown images remain native.
- Navigate structured references to the start of their heading or LaTeX environment instead of revealing the label source.
- Report a display-math label without a supported equation environment as a validation issue.

## 0.1.1

- Render both `\ref` and `\eqref` to equation labels with parenthesized numbers.
- Add numbered references for labelled standard Markdown images and Obsidian image embeds.
- Add a comprehensive test note and local SVG fixture.

## 0.1.0

- Add source-preserving `\label`, `\ref`, `\eqref`, and `\cite` support.
- Add Live Preview, Reading-view, Source-mode, and MathJax integration.
- Add vault-wide label and BibTeX indexing with cross-file navigation.
- Add `.bib` files, fenced `bibtex` blocks, literature-note mapping, and key completion.
- Add reference validation, settings, mobile-safe runtime checks, tests, and release automation.
