import { describe, expect, it } from "vitest";
import { rewriteMath } from "../src/math-rewriter";
import { ReferenceIndex } from "../src/reference-index";
import { LabelRecord } from "../src/types";

function fakeIndex(labels: Record<string, Partial<LabelRecord>>): ReferenceIndex {
  return {
    resolveLabel(key: string) {
      const label = labels[key];
      if (!label) return null;
      return {
        key,
        path: "paper.md",
        kind: "equation",
        number: null,
        heading: null,
        offset: 0,
        line: 0,
        ch: 0,
        ...label
      } as LabelRecord;
    }
  } as unknown as ReferenceIndex;
}

describe("rewriteMath", () => {
  it("returns unrelated MathJax input byte-for-byte unchanged", () => {
    const source = String.raw`\frac{a_1}{b_2} + \begin{matrix}1&2\\3&4\end{matrix}`;
    expect(rewriteMath(source, true, fakeIndex({}))).toBe(source);
  });

  it("removes labels and adds a display tag", () => {
    const index = fakeIndex({ "eq:one": { number: "3" } });
    expect(
      rewriteMath(
        String.raw`\begin{equation}x=y\label{eq:one}\end{equation}`,
        true,
        index
      )
    ).toBe(
      "\\begin{equation}x=y\\tag{3}\n\\end{equation}"
    );
  });

  it("places tags inside supported equation environments", () => {
    const index = fakeIndex({ "eq:align": { number: "2" } });
    const source = String.raw`\begin{align}a&=b\label{eq:align}\end{align}`;
    expect(rewriteMath(source, true, index)).toBe(
      "\\begin{align}a&=b\\tag{2}\n\\end{align}"
    );
  });

  it("places tags inside alignat and flalign environments", () => {
    const index = fakeIndex({ "eq:wide": { number: "4" } });
    const alignat = String.raw`\begin{alignat}{2}a&=b\label{eq:wide}\end{alignat}`;
    const flalign = String.raw`\begin{flalign}a&=b\label{eq:wide}\end{flalign}`;
    expect(rewriteMath(alignat, true, index)).toBe(
      "\\begin{alignat}{2}a&=b\\tag{4}\n\\end{alignat}"
    );
    expect(rewriteMath(flalign, true, index)).toBe(
      "\\begin{flalign}a&=b\\tag{4}\n\\end{flalign}"
    );
  });

  it("resolves ref and eqref without changing an existing tag", () => {
    const index = fakeIndex({ "eq:a": { number: "A.1" } });
    const source = String.raw`x_{\ref{eq:a}} + \eqref{eq:a} \tag{custom}`;
    expect(rewriteMath(source, true, index)).toBe(
      String.raw`x_{\text{(A.1)}} + \text{(A.1)} \tag{custom}`
    );
  });

  it("keeps non-equation ref values unparenthesized", () => {
    const index = fakeIndex({ "sec:a": { kind: "heading", number: "2.1" } });
    expect(rewriteMath(String.raw`x_{\ref{sec:a}}`, false, index)).toBe(
      String.raw`x_{\text{2.1}}`
    );
  });

  it("does not add a tag to inline math", () => {
    const index = fakeIndex({ inline: { number: "1" } });
    expect(rewriteMath(String.raw`x\label{inline}`, false, index)).toBe("x");
  });

  it("does not tag a display label outside a numbered equation environment", () => {
    const index = fakeIndex({ bare: { kind: "paragraph", number: null } });
    expect(rewriteMath(String.raw`x\label{bare}`, true, index)).toBe("x");
  });
});
