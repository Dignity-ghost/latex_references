# Changelog

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
