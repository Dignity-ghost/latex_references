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
  it("removes labels and adds a display tag", () => {
    const index = fakeIndex({ "eq:one": { number: "3" } });
    expect(rewriteMath(String.raw`x=y\label{eq:one}`, true, index)).toBe(
      "x=y\n\\tag{3}"
    );
  });

  it("places tags inside supported equation environments", () => {
    const index = fakeIndex({ "eq:align": { number: "2" } });
    const source = String.raw`\begin{align}a&=b\label{eq:align}\end{align}`;
    expect(rewriteMath(source, true, index)).toBe(
      "\\begin{align}a&=b\\tag{2}\n\\end{align}"
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
});
