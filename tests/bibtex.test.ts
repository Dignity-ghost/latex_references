import { describe, expect, it } from "vitest";
import { parseBibTeX } from "../src/parser/bibtex";

describe("parseBibTeX", () => {
  it("parses multiple entries and nested braced values", () => {
    const source = String.raw`
@article{knuth1984,
  author = {Donald E. Knuth},
  title = {Literate {Programming}},
  year = {1984}
}

@book(lamport1994,
  title = "LaTeX: A Document Preparation System",
  year = 1994
)
`;
    const entries = parseBibTeX(source, "references.bib");
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      key: "knuth1984",
      type: "article",
      fields: {
        author: "Donald E. Knuth",
        title: "Literate {Programming}",
        year: "1984"
      }
    });
    expect(entries[1].fields.title).toBe("LaTeX: A Document Preparation System");
  });

  it("ignores BibTeX comments and string declarations", () => {
    const source = String.raw`
@string{journal = "Example"}
@comment{not an entry}
@misc{real, title={Real}}
`;
    expect(parseBibTeX(source, "references.bib").map((entry) => entry.key)).toEqual([
      "real"
    ]);
  });
});
