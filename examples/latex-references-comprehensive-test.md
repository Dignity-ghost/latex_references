---
title: LaTeX References 1.0.0 comprehensive test
---

# Comprehensive test \label{sec:test-root}

Place this file, `references.bib`, and `latex-references-test-figure.svg` in the same vault folder.
Source mode must always retain the regular LaTeX shown here. Live Preview and Reading view perform display-only transformations.

## Native Markdown remains native \label{sec:markdown}

- [Native heading link](#native-markdown-target)
- **Bold text**, *italic text*, a task list, and `inline code`
- Native Markdown image: ![Native Markdown image](latex-references-test-figure.svg)

### Native Markdown target

The link above must continue to be handled by Obsidian.

## Equations \label{sec:equations}

$$
\begin{equation}
E=mc^2
\label{eq:energy}
\end{equation}
$$

Equation~\ref{eq:energy} and Equation~\eqref{eq:energy} should both display `(1)`.

The following ordinary formula contains no reference command and must keep Obsidian's native behavior:

$$
a^2+b^2=c^2
$$

## Regular LaTeX figure \label{sec:figure}

\begin{figure}[!htbp]
  \centering
  \includegraphics[
    width=0.75\linewidth,
    keepaspectratio
  ]{latex-references-test-figure}
  \caption[Preview test]{A \textbf{native Markdown preview} generated from regular LaTeX source}
  \label{fig:workflow}
\end{figure}

Figure~\ref{fig:workflow} should display a clickable `1`. Activating it should scroll to the rendered image without moving the cursor to `\label{fig:workflow}`.

## External BibTeX bibliography \label{sec:citations}

Single citation~\cite{knuth1984}, multiple citations~\cite{lamport1994,knuth1984}, and a citation with locators~\cite[see][p. 97]{knuth1984}.

Every entry must come from the adjacent `references.bib`. Markdown code blocks are not bibliography sources.

## Excluded regions

The following content must remain ordinary code and must not define labels, figures, or bibliography entries:

```latex
\begin{figure}
\includegraphics{ignored.png}
\label{fig:ignored}
\end{figure}
\cite{ignored-citation}
```

## Final checks

- Markdown and math without supported reference commands remain unchanged.
- The regular LaTeX figure source is never rewritten.
- The figure image is displayed by Obsidian's native Markdown renderer.
- Equation, heading, figure, and `.bib` citation links all navigate correctly.
