import { describe, expect, it } from "vitest";
import { scanMarkdown } from "../src/parser/scanner";

describe("scanMarkdown", () => {
  it("indexes headings, equations, paragraph labels, references, and citations", () => {
    const source = String.raw`---
fake: \label{ignored-frontmatter}
---
# Introduction \label{sec:intro}

Text~\ref{sec:intro} and~\cite{alpha,beta}.

## Detail \label{sec:detail}

$$
x = y
\label{eq:first}
$$

See~\eqref{eq:first}. \label{para:note}
`;
    const index = scanMarkdown(source, "paper.md");

    expect(index.labels.map(({ key, kind, number }) => ({ key, kind, number }))).toEqual([
      { key: "sec:intro", kind: "heading", number: "1" },
      { key: "sec:detail", kind: "heading", number: "1.1" },
      { key: "eq:first", kind: "equation", number: "1" },
      { key: "para:note", kind: "paragraph", number: null }
    ]);
    expect(index.citationNumbers.get("alpha")).toBe(1);
    expect(index.citationNumbers.get("beta")).toBe(2);
    expect(index.commands.find((command) => command.name === "ref")?.hasNonBreakingPrefix).toBe(
      true
    );
    expect(index.labels.some((label) => label.key === "ignored-frontmatter")).toBe(false);
  });

  it("ignores code and comments", () => {
    const source = [
      "`\\ref{inline-code}`",
      "",
      "```latex",
      "\\label{fenced}",
      "\\cite{fenced-cite}",
      "```",
      "",
      "<!-- \\label{comment} -->",
      "",
      "Real \\ref{target}."
    ].join("\n");
    const index = scanMarkdown(source, "ignore.md");
    expect(index.commands.map((command) => command.argument)).toEqual(["target"]);
  });

  it("reports invalid and inline-math labels without consuming equation numbers", () => {
    const source = String.raw`
$x \label{inline}$

\label{bad key}

$$a=b\label{eq:ok}$$
`;
    const index = scanMarkdown(source, "errors.md");
    expect(index.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "inline-math-label",
      "invalid-label"
    ]);
    expect(index.labels).toMatchObject([{ key: "eq:ok", number: "1" }]);
  });

  it("numbers citation keys by first appearance", () => {
    const source = String.raw`A \cite[p. 2]{b,a}. B \cite{a,c}.`;
    const index = scanMarkdown(source, "cite.md");
    expect(Object.fromEntries(index.citationNumbers)).toEqual({ b: 1, a: 2, c: 3 });
    expect(index.citations[0].command.options).toEqual(["p. 2"]);
  });
});
