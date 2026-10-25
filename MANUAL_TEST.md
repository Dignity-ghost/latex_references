# Manual test checklist

Use the same test vault on desktop and mobile when possible. Copy `examples/latex-references-comprehensive-test.md` and `examples/latex-references-test-figure.svg` into the same vault folder before testing.

## Installation

- Copy `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/latex-references/`.
- Reload Obsidian and enable **LaTeX References**.
- Confirm the plugin can be enabled on Windows, macOS, Linux, iOS/iPadOS, and Android without a desktop-only warning.

## Rendering

- In Source mode, confirm every `\label`, `\ref`, `\eqref`, and `\cite` remains literal text.
- In Live Preview, confirm references and citations render when the cursor leaves them and reveal their source when the cursor enters with the keyboard.
- In Reading view, confirm labels are hidden and references are rendered.
- Confirm `~` before a rendered command does not appear as a tilde and behaves as non-breaking spacing.
- Confirm commands inside inline code, fenced code, frontmatter, and HTML comments remain unchanged.

## Equations

- Confirm the demo formula renders as equation `(1)` without writing `\tag{1}` into the note.
- Insert another labelled display formula before it and confirm the visible numbers update after Obsidian saves/rerenders the note.
- Confirm both `\eqref` and `\ref` render parenthesized numbers when they target equations.

## Figures

- Confirm a `\label{fig:key}` immediately after a standard Markdown image receives a figure number.
- Confirm `图~\ref{fig:key}` renders as a clickable bare figure number and jumps to the image label.
- Repeat with an Obsidian `![[image.png]]` embed if desired.

## Navigation

- Click/tap a heading reference, equation reference, figure reference, paragraph reference, and citation.
- Confirm each target opens and scrolls to the expected line.
- Use Ctrl-click or Cmd-click and confirm the target opens in a new pane.
- Open two different notes side by side and confirm references in both panes use their own document numbering.
- Rename and move a labelled note, then confirm navigation still works after reindexing.

## Citations and completion

- Type `\ref{`, `\eqref{`, and `\cite{` and confirm suggestions work with both hardware and mobile keyboards.
- Confirm multiple keys in `\cite{knuth1984,lamport1994}` render as `[1, 2]`.
- Confirm tapping a citation opens its literature note when one is mapped, otherwise its `.bib` entry.
- Add a missing citekey and confirm it appears as a red unresolved link.

## Diagnostics and resilience

- Run **LaTeX References: Validate references in current note**.
- Test a missing label, duplicate label, invalid label containing whitespace, and `\label` inside inline math.
- Disable and re-enable the plugin. Confirm ordinary Markdown remains intact and no source file has changed.
- Test while the device is offline; all features should continue to work.
