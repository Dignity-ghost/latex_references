import {
  CitationOccurrence,
  Diagnostic,
  DocumentIndex,
  LabelKind,
  LabelRecord,
  ParsedCommand
} from "../types";
import { parseReferenceCommands, validLabelKey } from "./commands";
import { parseMarkdownStructure } from "./markdown";
import { lineStarts, offsetToLineCh } from "./ranges";

function cleanHeading(text: string): string {
  return text.replace(/\\label\s*\{[^{}]*\}/gu, "").trim();
}

function splitCiteKeys(argument: string): string[] {
  return argument
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

function associatedFigure(
  source: string,
  figures: ReturnType<typeof parseMarkdownStructure>["figures"],
  commandStart: number
): (typeof figures)[number] | null {
  for (let index = figures.length - 1; index >= 0; index -= 1) {
    const figure = figures[index];
    if (figure.to > commandStart) continue;
    if (/^\s*$/u.test(source.slice(figure.to, commandStart))) return figure;
    return null;
  }
  return null;
}

export function scanMarkdown(source: string, path: string): DocumentIndex {
  const structure = parseMarkdownStructure(source);
  const commands = parseReferenceCommands(source, structure.excluded, structure.math);
  const starts = lineStarts(source);
  const labels: LabelRecord[] = [];
  const citations: CitationOccurrence[] = [];
  const diagnostics: Diagnostic[] = [];
  const localLabels = new Set<string>();

  const displayMath = structure.math.filter((range) => range.kind === "display");
  const equationNumbers = new Map<number, string>();
  let equationCounter = 0;
  for (const range of displayMath) {
    const hasLabel = commands.some(
      (command) =>
        command.name === "label" &&
        command.commandStart >= range.from &&
        command.commandStart < range.to
    );
    if (hasLabel) {
      equationCounter += 1;
      equationNumbers.set(range.from, String(equationCounter));
    }
  }

  const figureNumbers = new Map<number, string>();
  let figureCounter = 0;
  for (const figure of structure.figures) {
    const hasLabel = commands.some(
      (command) =>
        command.name === "label" &&
        associatedFigure(source, [figure], command.commandStart) !== null
    );
    if (hasLabel) {
      figureCounter += 1;
      figureNumbers.set(figure.from, String(figureCounter));
    }
  }

  const citationNumbers = new Map<string, number>();
  let nextCitationNumber = 1;

  for (const command of commands) {
    const location = offsetToLineCh(starts, command.commandStart);
    if (command.name === "cite") {
      const keys = splitCiteKeys(command.argument);
      for (const key of keys) {
        if (!citationNumbers.has(key)) {
          citationNumbers.set(key, nextCitationNumber);
          nextCitationNumber += 1;
        }
      }
      citations.push({ ...location, offset: command.commandStart, keys, command });
      continue;
    }
    if (command.name !== "label") continue;
    const key = command.argument.trim();
    if (!validLabelKey(key)) {
      diagnostics.push({
        ...location,
        offset: command.commandStart,
        code: "invalid-label",
        message: `Invalid label: ${key || "(empty)"}`,
        key
      });
      continue;
    }
    if (command.inMath === "inline") {
      diagnostics.push({
        ...location,
        offset: command.commandStart,
        code: "inline-math-label",
        message: `Labels are not supported in inline math: ${key}`,
        key
      });
      continue;
    }
    if (localLabels.has(key)) {
      diagnostics.push({
        ...location,
        offset: command.commandStart,
        code: "duplicate-label",
        message: `Duplicate label in ${path}: ${key}`,
        key
      });
      continue;
    }
    localLabels.add(key);

    let kind: LabelKind = "paragraph";
    let number: string | null = null;
    let headingText: string | null = null;
    const mathRange = displayMath.find(
      (range) =>
        command.commandStart >= range.from && command.commandStart < range.to
    );
    const heading = structure.headings.find(
      (candidate) =>
        command.commandStart >= candidate.from && command.commandStart < candidate.to
    );
    const figure = associatedFigure(source, structure.figures, command.commandStart);
    if (mathRange) {
      kind = "equation";
      number = equationNumbers.get(mathRange.from) ?? null;
    } else if (heading) {
      kind = "heading";
      number = heading.number;
      headingText = cleanHeading(heading.text);
    } else if (figure) {
      kind = "figure";
      number = figureNumbers.get(figure.from) ?? null;
      headingText = figure.caption || null;
    }
    labels.push({
      ...location,
      offset: command.commandStart,
      key,
      path,
      kind,
      number,
      heading: headingText
    });
  }

  return { path, labels, commands, citations, citationNumbers, diagnostics };
}

export function referenceCommands(index: DocumentIndex): ParsedCommand[] {
  return index.commands.filter(
    (command) => command.name === "ref" || command.name === "eqref"
  );
}
