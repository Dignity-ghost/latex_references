import {
  MarkdownPostProcessorContext,
  MarkdownRenderChild,
  MarkdownRenderer
} from "obsidian";
import { figureToMarkdown } from "./figure-render";
import { LatexReferencesHost } from "./host";
import { parseReferenceCommands } from "./parser/commands";
import { parseMarkdownStructure } from "./parser/markdown";
import { formatReference } from "./reference-format";
import { DocumentIndex, FigureRecord, LabelRecord, ParsedCommand } from "./types";

function makeLink(
  text: string,
  title: string,
  className: string,
  action: (newPane: boolean) => void
): HTMLAnchorElement {
  const link = createEl("a");
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
  const anchor = createSpan();
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
  const wrapper = createSpan();
  wrapper.className = "latex-references-citation";
  if (command.hasNonBreakingPrefix) wrapper.appendText("\u00a0");
  if (command.options.length === 2) {
    wrapper.appendText(`${command.options[0]} `);
  }
  wrapper.appendText("[");
  const keys = command.argument
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  keys.forEach((key, index) => {
    if (index > 0) wrapper.appendText(", ");
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
    wrapper.appendText(`, ${command.options[command.options.length - 1] ?? ""}`);
  }
  wrapper.appendText("]");
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

async function renderFigureSection(
  element: HTMLElement,
  context: MarkdownPostProcessorContext,
  host: LatexReferencesHost,
  documentIndex: DocumentIndex | null
): Promise<boolean> {
  const section = context.getSectionInfo(element);
  if (!section?.text.includes("\\begin")) return false;
  const structure = parseMarkdownStructure(section.text);
  const environments = structure.environments.filter(
    (environment) => environment.kind === "figure" && environment.graphics.length > 0
  );
  if (environments.length === 0) return false;

  let transformed = section.text;
  for (const environment of [...environments].reverse()) {
    const indexedLabel = environment.labelKey
      ? documentIndex?.labels.find(
          (label) => label.kind === "figure" && label.key === environment.labelKey
        )
      : null;
    const figure: FigureRecord = {
      from: environment.from,
      to: environment.to,
      caption: environment.caption,
      labelKey: environment.labelKey,
      number: indexedLabel?.number ?? null,
      graphics: environment.graphics
    };
    const markdown = figureToMarkdown(figure, (imagePath) =>
      host.resolveFigureImagePath(imagePath, context.sourcePath)
    );
    transformed = `${transformed.slice(0, environment.from)}${markdown}${transformed.slice(
      environment.to
    )}`;
  }

  const rendered = createDiv();
  const child = new MarkdownRenderChild(rendered);
  context.addChild(child);
  try {
    await MarkdownRenderer.render(
      host.app,
      transformed,
      rendered,
      context.sourcePath,
      child
    );
  } catch (error) {
    console.error("LaTeX References: failed to render a figure section.", error);
    return false;
  }
  element.replaceChildren(...Array.from(rendered.childNodes));
  element.classList.add("latex-references-figure-section");
  if (environments.length === 1 && environments[0].labelKey) {
    element.dataset.label = environments[0].labelKey;
  }
  return true;
}

function transformTextNode(
  node: Text,
  host: LatexReferencesHost,
  documentIndex: DocumentIndex | null
): void {
  const text = node.data;
  const commands = parseReferenceCommands(text);
  if (commands.length === 0) return;
  const fragment = createFragment();
  let cursor = 0;
  for (const command of commands) {
    fragment.appendText(text.slice(cursor, command.start));
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
      fragment.appendText(text.slice(command.start, command.end));
    }
    cursor = command.end;
  }
  fragment.appendText(text.slice(cursor));
  node.replaceWith(fragment);
}

export function createReadingPostProcessor(host: LatexReferencesHost) {
  return async (
    element: HTMLElement,
    context: MarkdownPostProcessorContext
  ): Promise<void> => {
    if (context.sourcePath.toLowerCase().endsWith(".bib")) return;
    if (!element.textContent?.includes("\\")) return;
    const documentIndex = host.index.getDocument(context.sourcePath);
    if (await renderFigureSection(element, context, host, documentIndex)) return;
    const walker = element.doc.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let current = walker.nextNode();
    while (current) {
      if (current.nodeType === Node.TEXT_NODE) {
        const textNode = current as Text;
        if (!shouldSkipNode(textNode)) nodes.push(textNode);
      }
      current = walker.nextNode();
    }
    for (const node of nodes) transformTextNode(node, host, documentIndex);
  };
}
