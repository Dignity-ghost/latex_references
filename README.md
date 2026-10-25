# LaTeX References

LaTeX References adds navigable `\label`, `\ref`, `\eqref`, and `\cite` commands to Obsidian without rewriting the Markdown file. The source remains portable LaTeX that can later be moved into a real LaTeX project.

The plugin is designed for every Obsidian platform: Windows, macOS, Linux, iOS, iPadOS, and Android. It uses no Node.js or Electron runtime APIs, external programs, accounts, telemetry, or network requests.

## Features

- Keep literal LaTeX commands in Markdown.
- Render references and citations in Live Preview and Reading view.
- Leave commands visible and editable in Source mode.
- Jump to labels in the current note or another note.
- Number labelled LaTeX equation/figure environments and Markdown headings.
- Read bibliography entries only from vault-local `.bib` files.
- Preview standard LaTeX `figure` environments through Obsidian's native Markdown renderer.
- Complete label and citation keys while typing.
- Reindex after notes and bibliography files are created, edited, renamed, moved, or deleted.
- Report unresolved references, missing citation keys, invalid labels, and duplicate labels.

## Syntax

```markdown
# Introduction \label{sec:introduction}

The objective is

$$
\begin{equation}
L(\theta) = \sum_i \ell_i(\theta).
\label{eq:objective}
\end{equation}
$$

As shown in Equation~\eqref{eq:objective}, the method from
Section~\ref{sec:introduction} follows earlier work~\cite{lamport1994,knuth1984}.
```

The Markdown file is not modified. In rendered views:

- `\ref{sec:introduction}` becomes a clickable section number.
- Both `\ref{eq:objective}` and `\eqref{eq:objective}` become clickable parenthesized equation numbers.
- `\cite{lamport1994,knuth1984}` becomes numbered citation links.
- `~` immediately before a command becomes a non-breaking space.

Obsidian still needs the outer `$$` delimiters, while the inner `equation` environment keeps the source easy to migrate to LaTeX. Supported numbered equation environments are `equation`, `align`, `alignat`, `flalign`, `gather`, and `multline`. Put one labelled equation environment in each display-math block. A label directly inside a bare `$$...$$` block, or inside inline math, is reported as invalid.

Use native Markdown syntax and native links for ordinary Markdown images; the plugin does not inspect or replace them. When portability to a LaTeX project matters, use a regular LaTeX figure environment:

```latex
\begin{figure}[htbp]
\centering
\includegraphics[width=\linewidth]{diagram.pdf}
\caption{System diagram}
\label{fig:system}
\end{figure}
```

In Live Preview and Reading view, the plugin temporarily converts each resolvable `\includegraphics` path into an Obsidian image embed and sends it through Obsidian's Markdown renderer. The source file remains exactly as written. Moving the Live Preview cursor into the environment reveals the original LaTeX for editing.

The figure compatibility layer recognizes `figure`/`figure*`, `\includegraphics`/`\includegraphics*`, multiline optional arguments, `\caption`, nested caption braces, `\label`, TeX comments, extensionless vault paths, and multiple images. Placement, floating, sizing, trimming, subfigures, `\graphicspath`, and other LaTeX layout behavior are intentionally not reproduced: images use Obsidian's default Markdown rendering. Keep the complete environment on its own lines.

Then `Figure~\ref{fig:system}` becomes a numbered link. Clicking it scrolls to the rendered figure without moving the editor cursor into the environment or revealing the raw label.

## Bibliographies

By default, every `.bib` file in the vault is indexed. Limit discovery in **Settings → LaTeX References → Bibliography paths** by entering vault-relative files or folders, one per line.

Markdown fenced blocks are deliberately not bibliography sources. They remain ordinary code, even when their language is `bibtex` or `bib`. Put entries in a real `.bib` file:

```bibtex
@article{knuth1984,
  author = {Donald E. Knuth},
  title = {Literate Programming},
  year = {1984}
}
```

A citation opens a matching literature note when one is available. A note can declare a key in frontmatter:

```yaml
---
citekey: knuth1984
---
```

The plugin also recognizes note names such as `@knuth1984.md` and `knuth1984.md`. Otherwise, it opens the exact entry in its `.bib` file.

## Numbering and scope

- Labels are unique across the vault. If a key is duplicated, the alphabetically first path is used and validation reports the conflict.
- Heading numbers follow the Markdown heading hierarchy within each note.
- Only labels inside supported, unstarred LaTeX equation environments consume equation numbers.
- Only labels inside `figure` or `figure*` environments consume figure numbers. Standard Markdown images and Obsidian image embeds are never intercepted.
- Citation numbers follow first appearance within each note.
- A label on an ordinary paragraph is a navigable anchor without an automatic number; `\ref` displays its key.

## Commands

- **Rebuild reference index** rescans the vault.
- **Validate references in current note** reports syntax, duplicate, unresolved-reference, and missing-citation counts.

Type `\ref{`, `\eqref{`, or `\cite{` to open completion suggestions.

## Installation for testing

1. Run `npm install` and `npm run build`.
2. Create `<vault>/.obsidian/plugins/latex-references/`.
3. Copy `main.js`, `manifest.json`, and `styles.css` into that folder.
4. Reload Obsidian and enable **LaTeX References** under **Settings → Community plugins**.

For mobile testing, install the built files into the same vault on desktop, allow the `.obsidian` folder to sync, and then reload and enable the plugin on the mobile device.

Use [MANUAL_TEST.md](./MANUAL_TEST.md) for a desktop/mobile verification checklist. The comprehensive fixture is [`examples/latex-references-comprehensive-test.md`](./examples/latex-references-comprehensive-test.md).

## Development

```sh
npm install
npm run typecheck
npm test
npm run build
```

The parser, scanner, numbering logic, BibTeX reader, and MathJax rewrite are isolated from Obsidian where practical and covered by unit tests.

## Privacy and platform compatibility

LaTeX References works entirely inside the vault. It does not make network requests, execute remote code, access files outside the vault, collect analytics, or run platform-specific binaries. Runtime code uses the Obsidian API, CodeMirror 6, MathJax supplied by Obsidian, and standard browser APIs.

Notes with no supported LaTeX commands take the no-op path: the plugin creates no editor decorations, and math without `\label`, `\ref`, or `\eqref` is returned to MathJax byte-for-byte unchanged. Disabling the plugin therefore leaves ordinary Markdown behavior and every source file intact.

## Known limitations

- Put at most one labelled equation environment in each display-math block in the current release.
- Figure preview resolves vault-local files used by `\includegraphics`; it is not a general LaTeX figure or graphics engine, and graphicx layout options do not control the Markdown preview.
- Obsidian's native Graph view and native Backlinks pane do not parse LaTeX commands as Wikilinks. Clicking rendered references and citations still performs precise navigation through the plugin's own index.
- Bibliography formatting is intentionally numeric and lightweight. The plugin does not implement a full BibTeX or CSL style engine.
- A newly entered math label can require the formula to rerender after the editor's normal save/update cycle.

## License and acknowledgements

LaTeX References is released under the MIT License. Its architecture was informed by [Equation Ordinal](https://github.com/Junzi-ana/equation-ordinal) and [Cite](https://github.com/PMGWork/obsidian-cite), both MIT-licensed Obsidian plugins. No source code from either project is copied in this initial implementation. See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
