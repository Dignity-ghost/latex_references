import {
  App,
  Editor,
  EditorPosition,
  EditorSuggest,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
  TFile
} from "obsidian";
import { LatexReferencesHost } from "./host";

interface ReferenceSuggestion {
  key: string;
  kind: "reference" | "citation";
  detail: string;
}

function fuzzyMatch(value: string, query: string): boolean {
  const haystack = value.toLocaleLowerCase();
  const needle = query.toLocaleLowerCase();
  let cursor = 0;
  for (const character of needle) {
    const found = haystack.indexOf(character, cursor);
    if (found === -1) return false;
    cursor = found + 1;
  }
  return true;
}

export class LatexReferenceSuggest extends EditorSuggest<ReferenceSuggestion> {
  constructor(app: App, private readonly host: LatexReferencesHost) {
    super(app);
  }

  onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    _file: TFile | null
  ): EditorSuggestTriggerInfo | null {
    const before = editor.getLine(cursor.line).slice(0, cursor.ch);
    const reference = /\\(?:eqref|ref)\s*\{([^{}]*)$/u.exec(before);
    if (reference) {
      const partial = reference[1];
      return {
        start: { line: cursor.line, ch: cursor.ch - partial.length },
        end: cursor,
        query: `reference\u0000${partial}`
      };
    }
    const citation = /\\cite(?:\s*\[[^\]]*\]){0,2}\s*\{([^{}]*)$/u.exec(before);
    if (citation) {
      const argument = citation[1];
      const partial = argument.slice(argument.lastIndexOf(",") + 1).trimStart();
      return {
        start: { line: cursor.line, ch: cursor.ch - partial.length },
        end: cursor,
        query: `citation\u0000${partial}`
      };
    }
    return null;
  }

  getSuggestions(context: EditorSuggestContext): ReferenceSuggestion[] {
    const [kind, query = ""] = context.query.split("\u0000", 2);
    if (kind === "reference") {
      return this.host.index
        .labelKeys()
        .filter((key) => fuzzyMatch(key, query))
        .slice(0, 50)
        .map((key) => {
          const label = this.host.index.resolveLabel(key);
          const detail = label
            ? `${label.kind}${label.number ? ` ${label.number}` : ""} · ${label.path}`
            : "";
          return { key, kind: "reference", detail };
        });
    }
    return this.host.index
      .citationKeys()
      .filter((key) => {
        const target = this.host.index.resolveCitation(key);
        const title = target?.entry.fields.title ?? "";
        const author = target?.entry.fields.author ?? "";
        return fuzzyMatch(`${key} ${title} ${author}`, query);
      })
      .slice(0, 50)
      .map((key) => {
        const target = this.host.index.resolveCitation(key);
        const title = target?.entry.fields.title ?? "";
        const year = target?.entry.fields.year ?? "";
        return {
          key,
          kind: "citation",
          detail: [title, year].filter(Boolean).join(" · ")
        };
      });
  }

  renderSuggestion(suggestion: ReferenceSuggestion, element: HTMLElement): void {
    const title = document.createElement("div");
    title.className = "latex-references-suggestion-title";
    title.textContent = suggestion.key;
    element.append(title);
    if (suggestion.detail) {
      const detail = document.createElement("div");
      detail.className = "latex-references-suggestion-detail";
      detail.textContent = suggestion.detail;
      element.append(detail);
    }
  }

  selectSuggestion(
    suggestion: ReferenceSuggestion,
    _event: MouseEvent | KeyboardEvent
  ): void {
    const context = this.context;
    if (!context) return;
    context.editor.replaceRange(suggestion.key, context.start, context.end);
  }
}
