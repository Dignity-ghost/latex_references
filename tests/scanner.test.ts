import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
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

  it("numbers labelled Markdown and Obsidian images as figures", () => {
    const source = String.raw`![Pipeline](pipeline.svg)
\label{fig:pipeline}

Unlabelled text.

![[result.png|Experiment result|480]] \label{fig:result}

Paragraph anchor. \label{para:after}
`;
    const index = scanMarkdown(source, "figures.md");
    expect(index.labels.map(({ key, kind, number, heading }) => ({
      key,
      kind,
      number,
      heading
    }))).toEqual([
      { key: "fig:pipeline", kind: "figure", number: "1", heading: "Pipeline" },
      { key: "fig:result", kind: "figure", number: "2", heading: "Experiment result" },
      { key: "para:after", kind: "paragraph", number: null, heading: null }
    ]);
  });

  it("ignores images inside frontmatter, code fences, inline code, and comments", () => {
    const source = [
      "---",
      "cover: '![[frontmatter.png]]'",
      "---",
      "`![inline](inline.png)`",
      "```markdown",
      "![fenced](fenced.png)",
      "```",
      "<!-- ![[comment.png]] -->",
      "![Real](real.png)",
      "\\label{fig:real}"
    ].join("\n");
    const index = scanMarkdown(source, "ignored-figures.md");
    expect(index.labels).toMatchObject([
      { key: "fig:real", kind: "figure", number: "1", heading: "Real" }
    ]);
  });

  it("keeps the comprehensive fixture free of scanner diagnostics", () => {
    const source = readFileSync(
      new URL("../examples/latex-references-comprehensive-test.md", import.meta.url),
      "utf8"
    );
    const index = scanMarkdown(source, "latex-references-comprehensive-test.md");
    expect(index.diagnostics).toEqual([]);
    expect(index.labels.filter((label) => label.kind === "equation")).toMatchObject([
      { key: "eq:energy", number: "1" },
      { key: "eq:loss", number: "2" },
      { key: "eq:derived", number: "3" }
    ]);
    expect(index.labels.filter((label) => label.kind === "figure")).toMatchObject([
      { key: "fig:workflow", number: "1" }
    ]);
    expect(index.citationNumbers.get("knuth1984")).toBe(1);
    expect(index.citationNumbers.get("lamport1994")).toBe(2);
    expect(index.commands.some((command) => command.argument.startsWith("ignored:"))).toBe(false);
  });
});
