import { describe, expect, it } from "vitest";
import { type App } from "obsidian";
import { ReferenceIndex } from "../src/reference-index";

describe("ReferenceIndex bibliography sources", () => {
  it("indexes .bib files but not fenced BibTeX in Markdown", async () => {
    const markdownFile = {
      path: "paper.md",
      extension: "md",
      basename: "paper"
    };
    const bibFile = {
      path: "references.bib",
      extension: "bib",
      basename: "references"
    };
    const sources: Record<string, string> = {
      "paper.md": [
        "```bibtex",
        "@article{embedded, title={Must stay code}}",
        "```",
        "",
        "External \\cite{external}."
      ].join("\n"),
      "references.bib": "@article{external, title={External entry}}"
    };
    const app = {
      vault: {
        getFiles: () => [markdownFile, bibFile],
        getMarkdownFiles: () => [markdownFile],
        cachedRead: async (file: { path: string }) => sources[file.path]
      },
      metadataCache: {
        getFileCache: () => null
      }
    } as unknown as App;

    const index = new ReferenceIndex(app);
    await index.initialize("");

    expect(index.resolveCitation("embedded")).toBeNull();
    expect(index.resolveCitation("external")?.entry).toMatchObject({
      path: "references.bib",
      source: "bib-file"
    });
    expect(index.citationKeys()).toEqual(["external"]);
  });

  it("accepts Windows separators in vault-relative bibliography settings", async () => {
    const included = {
      path: "bibliography/refs/library.bib",
      extension: "bib",
      basename: "library"
    };
    const excluded = {
      path: "other/library.bib",
      extension: "bib",
      basename: "library"
    };
    const sources: Record<string, string> = {
      "bibliography/refs/library.bib": "@book{included, title={Included}}",
      "other/library.bib": "@book{excluded, title={Excluded}}"
    };
    const app = {
      vault: {
        getFiles: () => [included, excluded],
        getMarkdownFiles: () => [],
        cachedRead: async (file: { path: string }) => sources[file.path]
      },
      metadataCache: {
        getFileCache: () => null
      }
    } as unknown as App;

    const index = new ReferenceIndex(app);
    await index.initialize(String.raw`bibliography\refs`);

    expect(index.citationKeys()).toEqual(["included"]);
  });
});
