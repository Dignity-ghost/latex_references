import { describe, expect, it } from "vitest";
import { figureToMarkdown } from "../src/figure-render";
import { FigureRecord } from "../src/types";

describe("figureToMarkdown", () => {
  it("creates native Obsidian embeds without changing the source figure", () => {
    const figure: FigureRecord = {
      from: 0,
      to: 100,
      caption: String.raw`A \textbf{portable} figure with $x$\label{fig:test}`,
      labelKey: "fig:test",
      number: "2",
      graphics: [
        { from: 10, to: 30, path: "figures/one", options: "width=0.8\\linewidth" },
        { from: 40, to: 60, path: "missing/two.png", options: null }
      ]
    };
    const markdown = figureToMarkdown(figure, (path) =>
      path === "figures/one" ? "figures/one.svg" : null
    );
    expect(markdown).toBe(
      [
        "![[figures/one.svg]]",
        "![A portable figure with x](<missing/two.png>)",
        "*Figure 2. A portable figure with $x$*"
      ].join("\n\n")
    );
  });
});
