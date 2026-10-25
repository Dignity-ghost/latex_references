import { Extension, StateEffect } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
  WidgetType
} from "@codemirror/view";
import { editorLivePreviewField } from "obsidian";
import { LatexReferencesHost } from "./host";
import { scanMarkdown } from "./parser/scanner";
import { LabelRecord, ParsedCommand } from "./types";

const refreshEffect = StateEffect.define<void>();
const editorViews = new Set<EditorView>();

function selectionTouches(view: EditorView, from: number, to: number): boolean {
  return view.state.selection.ranges.some(
    (range) => range.from <= to && range.to >= from
  );
}

function prefix(command: ParsedCommand): string {
  return command.hasNonBreakingPrefix ? "\u00a0" : "";
}

function createAccessibleLink(
  text: string,
  title: string,
  className: string,
  action: (newPane: boolean) => void
): HTMLAnchorElement {
  const link = document.createElement("a");
  link.className = className;
  link.textContent = text;
  link.title = title;
  link.href = "#";
  link.setAttribute("role", "link");
  link.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    action(event.metaKey || event.ctrlKey);
  });
  link.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    action(event.metaKey || event.ctrlKey);
  });
  return link;
}

class ReferenceWidget extends WidgetType {
  constructor(
    private readonly host: LatexReferencesHost,
    private readonly key: string,
    private readonly text: string,
    private readonly unresolved: boolean
  ) {
    super();
  }

  eq(other: ReferenceWidget): boolean {
    return (
      other.key === this.key &&
      other.text === this.text &&
      other.unresolved === this.unresolved
    );
  }

  toDOM(): HTMLElement {
    return createAccessibleLink(
      this.text,
      this.unresolved ? `Unresolved reference: ${this.key}` : `Open ${this.key}`,
      `latex-references-link${this.unresolved ? " is-unresolved" : ""}`,
      (newPane) => void this.host.navigateToLabel(this.key, newPane)
    );
  }

  ignoreEvent(): boolean {
    return true;
  }
}

class CitationWidget extends WidgetType {
  constructor(
    private readonly host: LatexReferencesHost,
    private readonly keys: string[],
    private readonly numbers: Array<number | null>,
    private readonly nonBreakingPrefix: boolean,
    private readonly options: string[]
  ) {
    super();
  }

  eq(other: CitationWidget): boolean {
    return (
      other.nonBreakingPrefix === this.nonBreakingPrefix &&
      other.keys.join("\u0000") === this.keys.join("\u0000") &&
      other.numbers.join("\u0000") === this.numbers.join("\u0000") &&
      other.options.join("\u0000") === this.options.join("\u0000")
    );
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement("span");
    wrapper.className = "latex-references-citation";
    if (this.nonBreakingPrefix) wrapper.append(document.createTextNode("\u00a0"));
    if (this.options.length === 2) {
      wrapper.append(document.createTextNode(`${this.options[0]} `));
    }
    wrapper.append(document.createTextNode("["));
    this.keys.forEach((key, index) => {
      if (index > 0) wrapper.append(document.createTextNode(", "));
      const number = this.numbers[index];
      wrapper.append(
        createAccessibleLink(
          number === null ? `?${key}` : String(number),
          number === null ? `Missing bibliography entry: ${key}` : `Open citation ${key}`,
          `latex-references-citation-link${number === null ? " is-unresolved" : ""}`,
          (newPane) => void this.host.navigateToCitation(key, newPane)
        )
      );
    });
    if (this.options.length > 0) {
      wrapper.append(
        document.createTextNode(`, ${this.options[this.options.length - 1] ?? ""}`)
      );
    }
    wrapper.append(document.createTextNode("]"));
    return wrapper;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

class LabelWidget extends WidgetType {
  constructor(private readonly key: string) {
    super();
  }

  eq(other: LabelWidget): boolean {
    return other.key === this.key;
  }

  toDOM(): HTMLElement {
    const marker = document.createElement("span");
    marker.className = "latex-references-label-marker";
    marker.textContent = "¶";
    marker.title = `Label: ${this.key}`;
    marker.setAttribute("aria-label", `Label ${this.key}`);
    return marker;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

function labelDisplay(command: ParsedCommand, label: LabelRecord | null): string {
  if (!label) return `?${command.argument.trim()}`;
  const value = label.number ?? label.key;
  return command.name === "eqref" ? `(${value})` : value;
}

function buildDecorations(
  view: EditorView,
  host: LatexReferencesHost
): DecorationSet {
  if (!view.state.field(editorLivePreviewField, false)) return Decoration.none;
  const source = view.state.doc.toString();
  const path = host.resolveEditorPath(view) ?? "__live__.md";
  if (path.toLowerCase().endsWith(".bib")) return Decoration.none;
  const documentIndex = scanMarkdown(source, path);
  const localLabels = new Map(documentIndex.labels.map((label) => [label.key, label]));
  const decorations: Array<{ from: number; to: number; decoration: Decoration }> = [];

  for (const command of documentIndex.commands) {
    if (command.inMath !== null) continue;
    if (selectionTouches(view, command.start, command.end)) continue;

    if (command.name === "label") {
      const key = command.argument.trim();
      const decoration = host.settings.showLabelMarkers
        ? Decoration.replace({ widget: new LabelWidget(key) })
        : Decoration.replace({});
      decorations.push({ from: command.start, to: command.end, decoration });
      continue;
    }

    if (
      (command.name === "ref" || command.name === "eqref") &&
      host.settings.renderReferences
    ) {
      const key = command.argument.trim();
      const label = localLabels.get(key) ?? host.index.resolveLabel(key);
      const text = `${prefix(command)}${labelDisplay(command, label ?? null)}`;
      decorations.push({
        from: command.start,
        to: command.end,
        decoration: Decoration.replace({
          widget: new ReferenceWidget(host, key, text, !label)
        })
      });
      continue;
    }

    if (command.name === "cite" && host.settings.renderCitations) {
      const keys = command.argument
        .split(",")
        .map((key) => key.trim())
        .filter(Boolean);
      const numbers = keys.map((key) =>
        host.index.resolveCitation(key) ? documentIndex.citationNumbers.get(key) ?? null : null
      );
      decorations.push({
        from: command.start,
        to: command.end,
        decoration: Decoration.replace({
          widget: new CitationWidget(
            host,
            keys,
            numbers,
            command.hasNonBreakingPrefix,
            command.options
          )
        })
      });
    }
  }

  decorations.sort((a, b) => a.from - b.from || a.to - b.to);
  const builder = decorations.map(({ from, to, decoration }) => decoration.range(from, to));
  return Decoration.set(builder, true);
}

export function createEditorExtension(host: LatexReferencesHost): Extension {
  class LatexReferencesViewPlugin implements PluginValue {
      decorations: DecorationSet;
      private path: string | null;

      constructor(private readonly view: EditorView) {
        editorViews.add(view);
        this.path = host.resolveEditorPath(view);
        this.decorations = buildDecorations(view, host);
        this.publishLiveDocument();
      }

      update(update: ViewUpdate): void {
        const refreshed = update.transactions.some((transaction) =>
          transaction.effects.some((effect) => effect.is(refreshEffect))
        );
        if (
          update.docChanged ||
          update.selectionSet ||
          update.viewportChanged ||
          refreshed
        ) {
          this.path = host.resolveEditorPath(update.view) ?? this.path;
          this.decorations = buildDecorations(update.view, host);
        }
        if (update.docChanged) this.publishLiveDocument();
      }

      destroy(): void {
        editorViews.delete(this.view);
      }

      private publishLiveDocument(): void {
        if (!this.path) return;
        const path = this.path;
        const source = this.view.state.doc.toString();
        window.setTimeout(() => host.updateLiveDocument(path, source), 0);
      }
  }

  return ViewPlugin.fromClass<LatexReferencesViewPlugin>(
    LatexReferencesViewPlugin,
    { decorations: (plugin) => plugin.decorations }
  );
}

export function refreshEditorDecorations(): void {
  for (const view of editorViews) {
    view.dispatch({ effects: refreshEffect.of(undefined) });
  }
}
