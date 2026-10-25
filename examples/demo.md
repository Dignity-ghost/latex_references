---
title: LaTeX References demo
---

# Introduction \label{sec:introduction}

This note demonstrates portable inline references. Section~\ref{sec:introduction}
is the first labelled heading.

## Equations \label{sec:equations}

The first labelled display equation is

$$
E = mc^2.
\label{eq:energy}
$$

Equation~\eqref{eq:energy} can be referenced from an ordinary Markdown
paragraph without changing the source syntax. See also~\cite{knuth1984,lamport1994}.

This paragraph has a navigation-only anchor. \label{para:anchor}

Jump back to~\ref{para:anchor}.

```latex
Examples inside code stay unchanged: \ref{eq:energy}, \cite{knuth1984}.
```
