import { describe, expect, it } from "vitest";
import { formatReference } from "../src/reference-format";
import { LabelKind, LabelRecord } from "../src/types";

function label(kind: LabelKind, number: string | null): LabelRecord {
  return {
    key: `${kind}:target`,
    path: "paper.md",
    kind,
    number,
    heading: null,
    offset: 0,
    line: 0,
    ch: 0
  };
}

describe("formatReference", () => {
  it("parenthesizes ref and eqref when the target is an equation", () => {
    const equation = label("equation", "3");
    expect(formatReference("ref", equation, equation.key)).toBe("(3)");
    expect(formatReference("eqref", equation, equation.key)).toBe("(3)");
  });

  it("keeps ordinary ref values bare", () => {
    expect(formatReference("ref", label("heading", "2.1"), "sec:target")).toBe("2.1");
    expect(formatReference("ref", label("figure", "4"), "fig:target")).toBe("4");
    expect(formatReference("ref", label("paragraph", null), "para:target")).toBe(
      "paragraph:target"
    );
  });

  it("always parenthesizes eqref and marks unresolved keys", () => {
    expect(formatReference("eqref", label("figure", "4"), "fig:target")).toBe("(4)");
    expect(formatReference("ref", null, " missing:key ")).toBe("?missing:key");
  });
});
