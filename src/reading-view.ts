import { MarkdownPostProcessorContext } from "obsidian";
import { LatexReferencesHost } from "./host";
import { parseReferenceCommands } from "./parser/commands";
import { formatReference } from "./reference-format";
import { DocumentIndex, LabelRecord, ParsedCommand } from "./types";

function makeLink(
  text: string,
  title: string,
  className: string,
  action: (newPane: boolean) => void
): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = "#";
  link.className = className;
  link.textContent = text;
  link.title = title;
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

function referenceText(command: ParsedCommand, label: LabelRecord | null): string {
  const prefix = command.hasNonBreakingPrefix ? "\u00a0" : "";
  const name = command.name === "eqref" ? "eqref" : "ref";
  return `${prefix}${formatReference(name, label, command.argument)}`;
}

function labelAnchor(key: string, showMarker: boolean): HTMLSpanElement {
  const anchor = document.createElement("span");
  anchor.className = "latex-references-label-anchor";
  anchor.id = `latex-label-${encodeURIComponent(key)}`;
  anchor.dataset.label = key;
  anchor.title = `Label: ${key}`;
  if (showMarker) {
    anchor.classList.add("is-visible");
    anchor.textContent = "¶";
  }
  return anchor;
}

function citationElement(
  host: LatexReferencesHost,
  command: ParsedCommand,
  documentIndex: DocumentIndex | null
): HTMLElement {
  const wrapper = document.createElement("span");
  wrapper.className = "latex-references-citation";
  if (command.hasNonBreakingPrefix) wrapper.append(document.createTextNode("\u00a0"));
  if (command.options.length === 2) {
    wrapper.append(document.createTextNode(`${command.options[0]} `));
  }
  wrapper.append(document.createTextNode("["));
  const keys = command.argument
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  keys.forEach((key, index) => {
    if (index > 0) wrapper.append(document.createTextNode(", "));
    const target = host.index.resolveCitation(key);
    const number = documentIndex?.citationNumbers.get(key) ?? null;
    wrapper.append(
      makeLink(
        target && number !== null ? String(number) : `?${key}`,
        target ? `Open citation ${key}` : `Missing bibliography entry: ${key}`,
        `latex-references-citation-link${target ? "" : " is-unresolved"}`,
        (newPane) => void host.navigateToCitation(key, newPane)
      )
    );
  });
  if (command.options.length > 0) {
    wrapper.append(
      document.createTextNode(`, ${command.options[command.options.length - 1] ?? ""}`)
    );
  }
  wrapper.append(document.createTextNode("]"));
  return wrapper;
}

function shouldSkipNode(node: Text): boolean {
  const parent = node.parentElement;
  return Boolean(
    parent?.closest(
      "code, pre, a, script, style, .math, .math-block, .MathJax, mjx-container, .latex-references-citation"
    )
  );
}

function transformTextNode(
  node: Text,
  host: LatexReferencesHost,
  documentIndex: DocumentIndex | null
): void {
  const text = node.data;
  const commands = parseReferenceCommands(text);
  if (commands.length === 0) return;
  const fragment = document.createDocumentFragment();
  let cursor = 0;
  for (const command of commands) {
    fragment.append(document.createTextNode(text.slice(cursor, command.start)));
    const key = command.argument.trim();
    if (command.name === "label") {
      fragment.append(labelAnchor(key, host.settings.showLabelMarkers));
    } else if (
      (command.name === "ref" || command.name === "eqref") &&
      host.settings.renderReferences
    ) {
      const label = host.index.resolveLabel(key);
      fragment.append(
        makeLink(
          referenceText(command, label),
          label ? `Open ${key}` : `Unresolved reference: ${key}`,
          `latex-references-link${label ? "" : " is-unresolved"}`,
          (newPane) => void host.navigateToLabel(key, newPane)
        )
      );
    } else if (command.name === "cite" && host.settings.renderCitations) {
      fragment.append(citationElement(host, command, documentIndex));
    } else {
      fragment.append(document.createTextNode(text.slice(command.start, command.end)));
    }
    cursor = command.end;
  }
  fragment.append(document.createTextNode(text.slice(cursor)));
  node.replaceWith(fragment);
}

export function createReadingPostProcessor(host: LatexReferencesHost) {
  return (element: HTMLElement, context: MarkdownPostProcessorContext): void => {
    if (context.sourcePath.toLowerCase().endsWith(".bib")) return;
    const documentIndex = host.index.getDocument(context.sourcePath);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let current = walker.nextNode();
    while (current) {
      if (current instanceof Text && !shouldSkipNode(current)) nodes.push(current);
      current = walker.nextNode();
    }
    for (const node of nodes) transformTextNode(node, host, documentIndex);
  };
}
