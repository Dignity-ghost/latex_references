import {
  CitationOccurrence,
  Diagnostic,
  DocumentIndex,
  LabelKind,
  LabelRecord,
  ParsedCommand
} from "../types";
import { parseReferenceCommands, validLabelKey } from "./commands";
import { parseMarkdownStructure, type LatexEnvironment } from "./markdown";
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

function containingEnvironment(
  environments: LatexEnvironment[],
  offset: number
): LatexEnvironment | null {
  let result: LatexEnvironment | null = null;
  for (const environment of environments) {
    if (offset < environment.contentFrom || offset >= environment.contentTo) continue;
    if (!result || environment.to - environment.from < result.to - result.from) {
      result = environment;
    }
  }
  return result;
}

export function scanMarkdown(source: string, path: string): DocumentIndex {
  const structure = parseMarkdownStructure(source);
  const commands = parseReferenceCommands(source, structure.excluded, structure.math);
  const starts = lineStarts(source);
  const labels: LabelRecord[] = [];
  const citations: CitationOccurrence[] = [];
  const diagnostics: Diagnostic[] = [];
  const localLabels = new Set<string>();

  const acceptedLabelCommands: ParsedCommand[] = [];
  const acceptedKeys = new Set<string>();
  for (const command of commands) {
    if (command.name !== "label" || command.inMath === "inline") continue;
    const key = command.argument.trim();
    if (!validLabelKey(key) || acceptedKeys.has(key)) continue;
    const environment = containingEnvironment(
      structure.environments,
      command.commandStart
    );
    if (command.inMath === "display" && environment?.kind !== "equation") continue;
    acceptedKeys.add(key);
    acceptedLabelCommands.push(command);
  }
  const equationEnvironments = structure.environments.filter(
    (environment) => environment.kind === "equation"
  );
  const equationNumbers = new Map<number, string>();
  let equationCounter = 0;
  for (const environment of equationEnvironments) {
    const hasLabel = acceptedLabelCommands.some(
      (command) =>
        containingEnvironment(structure.environments, command.commandStart) === environment
    );
    if (hasLabel) {
      equationCounter += 1;
      equationNumbers.set(environment.from, String(equationCounter));
    }
  }

  const figureEnvironments = structure.environments.filter(
    (environment) => environment.kind === "figure"
  );
  const figureNumbers = new Map<number, string>();
  let figureCounter = 0;
  for (const environment of figureEnvironments) {
    const hasLabel = acceptedLabelCommands.some(
      (command) =>
        containingEnvironment(structure.environments, command.commandStart) === environment
    );
    if (hasLabel) {
      figureCounter += 1;
      figureNumbers.set(environment.from, String(figureCounter));
    }
  }
  const figures = figureEnvironments.map((environment) => ({
    from: environment.from,
    to: environment.to,
    caption: environment.caption,
    labelKey: environment.labelKey,
    number: figureNumbers.get(environment.from) ?? null,
    graphics: environment.graphics
  }));
  for (const figure of figures) {
    if (figure.graphics.length > 0) continue;
    const location = offsetToLineCh(starts, figure.from);
    diagnostics.push({
      ...location,
      offset: figure.from,
      code: "figure-missing-graphic",
      message: "Figure environment has no supported \\includegraphics command.",
      key: figure.labelKey ?? undefined
    });
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
    const environment = containingEnvironment(
      structure.environments,
      command.commandStart
    );
    if (command.inMath === "display" && environment?.kind !== "equation") {
      diagnostics.push({
        ...location,
        offset: command.commandStart,
        code: "display-math-label-without-environment",
        message: `Display-math labels require an equation environment: ${key}`,
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
    const heading = structure.headings.find(
      (candidate) =>
        command.commandStart >= candidate.from && command.commandStart < candidate.to
    );
    let targetOffset = starts[location.line] ?? command.commandStart;
    if (environment?.kind === "equation") {
      kind = "equation";
      number = equationNumbers.get(environment.from) ?? null;
      targetOffset = environment.from;
    } else if (heading) {
      kind = "heading";
      number = heading.number;
      headingText = cleanHeading(heading.text);
      targetOffset = heading.from;
    } else if (environment?.kind === "figure") {
      kind = "figure";
      number = figureNumbers.get(environment.from) ?? null;
      headingText = environment.caption;
      targetOffset = environment.from;
    }
    const targetLocation = offsetToLineCh(starts, targetOffset);
    labels.push({
      ...targetLocation,
      offset: targetOffset,
      key,
      path,
      kind,
      number,
      heading: headingText
    });
  }

  return { path, labels, commands, citations, citationNumbers, figures, diagnostics };
}

export function referenceCommands(index: DocumentIndex): ParsedCommand[] {
  return index.commands.filter(
    (command) => command.name === "ref" || command.name === "eqref"
  );
}
