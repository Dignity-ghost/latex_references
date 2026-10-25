import { containsOffset, isEscaped, mergeRanges, SourceRange } from "./ranges";

export interface LatexEnvironment extends SourceRange {
  contentFrom: number;
  contentTo: number;
  name: string;
  kind: "equation" | "figure";
  caption: string | null;
}

export interface MarkdownStructure {
  excluded: SourceRange[];
  math: Array<SourceRange & { kind: "display" | "inline" }>;
  headings: Array<SourceRange & { depth: number; text: string; number: string }>;
  environments: LatexEnvironment[];
  bibtexBlocks: SourceRange[];
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
  bibtexBlocks: SourceRange[];
} {
  const excluded: SourceRange[] = [];
  const bibtexBlocks: SourceRange[] = [];
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
    const language = fence[3].toLowerCase();
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
    if (language === "bibtex" || language === "bib") {
      const contentFrom = line.to;
      const contentTo = endLine > lineIndex ? lines[endLine].from : lines[endLine].to;
      bibtexBlocks.push({ from: contentFrom, to: contentTo });
    }
    lineIndex = endLine + 1;
  }
  return { excluded, bibtexBlocks };
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

function figureCaption(source: string, from: number, to: number): string | null {
  const match = /\\caption(?:\s*\[[^\]]*\])?\s*\{([^{}]*)\}/u.exec(
    source.slice(from, to)
  );
  return match?.[1].replace(/\s+/gu, " ").trim() || null;
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
    if (containsOffset(excluded, match.index) || isEscaped(source, match.index)) continue;
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
      environments.push({
        from: begin.from,
        to: expression.lastIndex,
        contentFrom: begin.contentFrom,
        contentTo: match.index,
        name,
        kind: begin.kind,
        caption:
          begin.kind === "figure"
            ? figureCaption(source, begin.contentFrom, match.index)
            : null
      });
      break;
    }
  }

  return environments.sort((a, b) => a.from - b.from || b.to - a.to);
}

export function parseMarkdownStructure(source: string): MarkdownStructure {
  const blocks = findBlockRanges(source);
  const excluded = findInlineExcluded(source, blocks.excluded);
  return {
    excluded,
    math: findMathRanges(source, excluded),
    headings: findHeadings(source, excluded),
    environments: findLatexEnvironments(source, excluded),
    bibtexBlocks: blocks.bibtexBlocks
  };
}
