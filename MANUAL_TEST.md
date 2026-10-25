# Manual test checklist

Use the same test vault on desktop and mobile when possible. Copy `examples/latex-references-comprehensive-test.md`, `examples/references.bib`, and `examples/latex-references-test-figure.svg` into the same vault folder before testing.

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
- Open a note containing no supported LaTeX commands and confirm native links, embeds, tasks, callouts, code, and math behave exactly as they do with the plugin disabled.

## Equations

- Confirm a label inside `\begin{equation}...\end{equation}` renders as equation `(1)` without writing `\tag{1}` into the note.
- Insert another labelled equation environment before it and confirm the visible numbers update after Obsidian saves/rerenders the note.
- Confirm both `\eqref` and `\ref` render parenthesized numbers when they target equations.
- Confirm an unlabelled bare `$$...$$` formula remains unnumbered.
- Put `\label` directly in a bare `$$...$$` block and confirm validation reports it.

## Figures

- Confirm standard Markdown images and Obsidian `![[image.png]]` embeds keep their native links and are not numbered by the plugin.
- Confirm the regular LaTeX `figure` fixture renders its extensionless `\includegraphics` path as the SVG through Obsidian's native renderer.
- Confirm its multiline graphicx options, `\caption`, and `\label{fig:workflow}` are parsed, while the image uses Obsidian's default size rather than emulating `width=0.75\linewidth`.
- Confirm `图~\ref{fig:workflow}` renders as a clickable bare number and scrolls to the rendered figure without moving the cursor into the environment or revealing the label source.
- Move the cursor into the figure and confirm the unmodified regular LaTeX source appears for editing; move it out and confirm the preview returns.

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
- Confirm the fixture citations resolve only after `references.bib` is present and jump to the exact `.bib` entry.
- Put a different entry in a fenced `bibtex` block in Markdown and confirm it remains code and is reported missing when cited.
- Add a missing citekey and confirm it appears as a red unresolved link.

## Diagnostics and resilience

- Run **LaTeX References: Validate references in current note**.
- Test a missing label, duplicate label, invalid label containing whitespace, and `\label` inside inline math.
- Disable and re-enable the plugin. Confirm ordinary Markdown remains intact and no source file has changed.
- Test while the device is offline; all features should continue to work.
