import { containsOffset, isEscaped, mergeRanges, SourceRange } from "./ranges";
import { type FigureGraphic } from "../types";

export interface LatexEnvironment extends SourceRange {
  contentFrom: number;
  contentTo: number;
  name: string;
  kind: "equation" | "figure";
  caption: string | null;
  labelKey: string | null;
  graphics: FigureGraphic[];
}

export interface MarkdownStructure {
  excluded: SourceRange[];
  math: Array<SourceRange & { kind: "display" | "inline" }>;
  headings: Array<SourceRange & { depth: number; text: string; number: string }>;
  environments: LatexEnvironment[];
}

const EQUATION_ENVIRONMENTS = new Set([
  "equation",
  "align",
  "alignat",
  "flalign",
  "gather",
  "multline"
]);
const FIGURE_ENVIRONMENTS = new Set(["figure", "figure*"]);

function lineOffsets(source: string): Array<{ from: number; to: number; text: string }> {
  const lines: Array<{ from: number; to: number; text: string }> = [];
  let from = 0;
  while (from <= source.length) {
    const newline = source.indexOf("\n", from);
    const to = newline === -1 ? source.length : newline + 1;
    lines.push({ from, to, text: source.slice(from, newline === -1 ? source.length : newline) });
    if (newline === -1) break;
    from = newline + 1;
  }
  return lines;
}

function findBlockRanges(source: string): {
  excluded: SourceRange[];
} {
  const excluded: SourceRange[] = [];
  const lines = lineOffsets(source);
  let lineIndex = 0;

  if (lines[0]?.text.trim() === "---") {
    for (let i = 1; i < lines.length; i += 1) {
      if (lines[i].text.trim() === "---") {
        excluded.push({ from: lines[0].from, to: lines[i].to });
        lineIndex = i + 1;
        break;
      }
    }
  }

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];
    const fence = /^(\s*)(`{3,}|~{3,})\s*([^\s`]*)/.exec(line.text);
    if (!fence) {
      lineIndex += 1;
      continue;
    }
    const marker = fence[2][0];
    const minimumLength = fence[2].length;
    let endLine = lineIndex;
    for (let i = lineIndex + 1; i < lines.length; i += 1) {
      const closing = new RegExp(`^\\s*${marker}{${minimumLength},}\\s*$`).test(lines[i].text);
      if (closing) {
        endLine = i;
        break;
      }
      endLine = i;
    }
    const range = { from: line.from, to: lines[endLine].to };
    excluded.push(range);
    lineIndex = endLine + 1;
  }
  return { excluded };
}

function findInlineExcluded(source: string, initial: SourceRange[]): SourceRange[] {
  const ranges = [...initial];
  for (let i = 0; i < source.length; i += 1) {
    if (containsOffset(initial, i)) continue;
    if (source.startsWith("<!--", i)) {
      const end = source.indexOf("-->", i + 4);
      ranges.push({ from: i, to: end === -1 ? source.length : end + 3 });
      i = end === -1 ? source.length : end + 2;
      continue;
    }
    if (source[i] !== "`" || isEscaped(source, i)) continue;
    let count = 1;
    while (source[i + count] === "`") count += 1;
    const delimiter = "`".repeat(count);
    const end = source.indexOf(delimiter, i + count);
    if (end !== -1) {
      ranges.push({ from: i, to: end + count });
      i = end + count - 1;
    }
  }
  return mergeRanges(ranges);
}

function findMathRanges(
  source: string,
  excluded: SourceRange[]
): Array<SourceRange & { kind: "display" | "inline" }> {
  const ranges: Array<SourceRange & { kind: "display" | "inline" }> = [];
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] !== "$" || isEscaped(source, i) || containsOffset(excluded, i)) continue;
    const display = source[i + 1] === "$";
    const delimiter = display ? "$$" : "$";
    const contentFrom = i + delimiter.length;
    let end = contentFrom;
    while (end < source.length) {
      const found = source.indexOf(delimiter, end);
      if (found === -1) {
        end = -1;
        break;
      }
      if (!isEscaped(source, found) && !containsOffset(excluded, found)) {
        end = found;
        break;
      }
      end = found + delimiter.length;
    }
    if (end === -1) continue;
    ranges.push({
      from: contentFrom,
      to: end,
      kind: display ? "display" : "inline"
    });
    i = end + delimiter.length - 1;
  }
  return ranges;
}

function findHeadings(source: string, excluded: SourceRange[]): MarkdownStructure["headings"] {
  const candidates: Array<SourceRange & { depth: number; text: string }> = [];
  for (const line of lineOffsets(source)) {
    if (containsOffset(excluded, line.from)) continue;
    const match = /^( {0,3})(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line.text);
    if (!match) continue;
    candidates.push({
      from: line.from,
      to: line.to,
      depth: match[2].length,
      text: match[3]
    });
  }
  if (candidates.length === 0) return [];
  const baseDepth = Math.min(...candidates.map((heading) => heading.depth));
  const counters = Array<number>(7).fill(0);
  return candidates.map((heading) => {
    counters[heading.depth] += 1;
    for (let depth = heading.depth + 1; depth < counters.length; depth += 1) {
      counters[depth] = 0;
    }
    const parts: number[] = [];
    for (let depth = baseDepth; depth <= heading.depth; depth += 1) {
      parts.push(counters[depth] || 1);
    }
    return { ...heading, number: parts.join(".") };
  });
}

function environmentKind(name: string): LatexEnvironment["kind"] | null {
  if (EQUATION_ENVIRONMENTS.has(name)) return "equation";
  if (FIGURE_ENVIRONMENTS.has(name)) return "figure";
  return null;
}

function inLatexComment(source: string, offset: number): boolean {
  const lineStart = source.lastIndexOf("\n", offset - 1) + 1;
  for (let index = lineStart; index < offset; index += 1) {
    if (source[index] === "%" && !isEscaped(source, index)) return true;
  }
  return false;
}

function skipLatexSpacing(source: string, start: number, limit: number): number {
  let cursor = start;
  while (cursor < limit) {
    if (/\s/u.test(source[cursor])) {
      cursor += 1;
      continue;
    }
    if (source[cursor] === "%" && !isEscaped(source, cursor)) {
      const newline = source.indexOf("\n", cursor + 1);
      cursor = newline === -1 || newline >= limit ? limit : newline + 1;
      continue;
    }
    break;
  }
  return cursor;
}

function readLatexDelimited(
  source: string,
  start: number,
  limit: number,
  open: string,
  close: string
): { value: string; end: number } | null {
  if (source[start] !== open) return null;
  let depth = 1;
  for (let cursor = start + 1; cursor < limit; cursor += 1) {
    if (source[cursor] === "%" && !isEscaped(source, cursor)) {
      const newline = source.indexOf("\n", cursor + 1);
      if (newline === -1 || newline >= limit) return null;
      cursor = newline;
      continue;
    }
    if (isEscaped(source, cursor)) continue;
    if (source[cursor] === open) depth += 1;
    if (source[cursor] === close) depth -= 1;
    if (depth === 0) {
      return { value: source.slice(start + 1, cursor), end: cursor + 1 };
    }
  }
  return null;
}

function withoutLatexComments(value: string): string {
  return value
    .split("\n")
    .map((line) => {
      for (let index = 0; index < line.length; index += 1) {
        if (line[index] === "%" && !isEscaped(line, index)) return line.slice(0, index);
      }
      return line;
    })
    .join(" ")
    .trim();
}

function figureMetadata(
  source: string,
  from: number,
  to: number
): { caption: string | null; labelKey: string | null; graphics: FigureGraphic[] } {
  const graphics: FigureGraphic[] = [];
  let caption: string | null = null;
  let labelKey: string | null = null;

  for (let cursor = from; cursor < to; cursor += 1) {
    if (source[cursor] === "%" && !isEscaped(source, cursor)) {
      const newline = source.indexOf("\n", cursor + 1);
      if (newline === -1 || newline >= to) break;
      cursor = newline;
      continue;
    }
    if (source[cursor] !== "\\" || isEscaped(source, cursor)) continue;
    const match = /^\\(includegraphics\*?|caption|label)(?![A-Za-z])/u.exec(
      source.slice(cursor, to)
    );
    if (!match) continue;
    const command = match[1];
    const commandStart = cursor;
    let argumentStart = skipLatexSpacing(source, cursor + match[0].length, to);
    let options: string | null = null;
    if (source[argumentStart] === "[") {
      const optional = readLatexDelimited(source, argumentStart, to, "[", "]");
      if (!optional) continue;
      options = withoutLatexComments(optional.value);
      argumentStart = skipLatexSpacing(source, optional.end, to);
    }
    const argument = readLatexDelimited(source, argumentStart, to, "{", "}");
    if (!argument) continue;
    const value = withoutLatexComments(argument.value);
    if (command.startsWith("includegraphics")) {
      if (value) {
        graphics.push({
          from: commandStart,
          to: argument.end,
          path: value,
          options
        });
      }
    } else if (command === "caption" && caption === null) {
      const visibleCaption = value.replace(/\\label\s*\{[^{}]*\}/gu, "").trim();
      caption = visibleCaption || null;
      // A label nested in a caption is valid LaTeX and must still be discovered.
      continue;
    } else if (command === "label" && labelKey === null) {
      labelKey = value || null;
    }
    cursor = argument.end - 1;
  }

  return { caption, labelKey, graphics };
}

function findLatexEnvironments(
  source: string,
  excluded: SourceRange[]
): MarkdownStructure["environments"] {
  const environments: MarkdownStructure["environments"] = [];
  const stack: Array<{
    name: string;
    kind: LatexEnvironment["kind"];
    from: number;
    contentFrom: number;
  }> = [];
  const expression = /\\(begin|end)\s*\{\s*([A-Za-z]+\*?)\s*\}/gu;
  let match: RegExpExecArray | null;

  while ((match = expression.exec(source)) !== null) {
    if (
      containsOffset(excluded, match.index) ||
      isEscaped(source, match.index) ||
      inLatexComment(source, match.index)
    ) {
      continue;
    }
    const name = match[2];
    const kind = environmentKind(name);
    if (!kind) continue;
    if (match[1] === "begin") {
      stack.push({ name, kind, from: match.index, contentFrom: expression.lastIndex });
      continue;
    }

    for (let index = stack.length - 1; index >= 0; index -= 1) {
      const begin = stack[index];
      if (begin.name !== name) continue;
      stack.splice(index, 1);
      const metadata =
        begin.kind === "figure"
          ? figureMetadata(source, begin.contentFrom, match.index)
          : { caption: null, labelKey: null, graphics: [] };
      environments.push({
        from: begin.from,
        to: expression.lastIndex,
        contentFrom: begin.contentFrom,
        contentTo: match.index,
        name,
        kind: begin.kind,
        ...metadata
      });
      break;
    }
  }

  return environments.sort((a, b) => a.from - b.from || b.to - a.to);
}

function findLatexCommentRanges(
  source: string,
  environments: MarkdownStructure["environments"]
): SourceRange[] {
  const ranges: SourceRange[] = [];
  for (const environment of environments) {
    for (let cursor = environment.contentFrom; cursor < environment.contentTo; cursor += 1) {
      if (source[cursor] !== "%" || isEscaped(source, cursor)) continue;
      const newline = source.indexOf("\n", cursor + 1);
      const to = newline === -1 || newline > environment.contentTo
        ? environment.contentTo
        : newline;
      ranges.push({ from: cursor, to });
      cursor = to;
    }
  }
  return mergeRanges(ranges);
}

export function parseMarkdownStructure(source: string): MarkdownStructure {
  const blocks = findBlockRanges(source);
  const excluded = findInlineExcluded(source, blocks.excluded);
  const environments = findLatexEnvironments(source, excluded);
  return {
    excluded: mergeRanges([...excluded, ...findLatexCommentRanges(source, environments)]),
    math: findMathRanges(source, excluded),
    headings: findHeadings(source, excluded),
    environments
  };
}
