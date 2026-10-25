import { ParsedCommand, ReferenceCommandName } from "../types";
import { containsOffset, isEscaped, SourceRange } from "./ranges";

const COMMAND_NAMES = new Set<ReferenceCommandName>([
  "label",
  "ref",
  "eqref",
  "cite"
]);

function parseDelimited(
  source: string,
  start: number,
  open: string,
  close: string
): { value: string; end: number } | null {
  if (source[start] !== open) return null;
  let depth = 1;
  for (let i = start + 1; i < source.length; i += 1) {
    if (isEscaped(source, i)) continue;
    if (source[i] === open) depth += 1;
    if (source[i] === close) depth -= 1;
    if (depth === 0) {
      return { value: source.slice(start + 1, i), end: i + 1 };
    }
  }
  return null;
}

function skipWhitespace(source: string, start: number): number {
  let cursor = start;
  while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
  return cursor;
}

export function parseReferenceCommands(
  source: string,
  excluded: SourceRange[] = [],
  mathRanges: Array<SourceRange & { kind: "display" | "inline" }> = []
): ParsedCommand[] {
  const commands: ParsedCommand[] = [];
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] !== "\\" || isEscaped(source, i) || containsOffset(excluded, i)) {
      continue;
    }

    const nameMatch = /^(label|eqref|ref|cite)\b/.exec(source.slice(i + 1));
    if (!nameMatch) continue;
    const name = nameMatch[1] as ReferenceCommandName;
    if (!COMMAND_NAMES.has(name)) continue;

    let cursor = skipWhitespace(source, i + 1 + name.length);
    const options: string[] = [];
    if (name === "cite") {
      for (let optionIndex = 0; optionIndex < 2; optionIndex += 1) {
        const option = parseDelimited(source, cursor, "[", "]");
        if (!option) break;
        options.push(option.value);
        cursor = skipWhitespace(source, option.end);
      }
    }

    const argument = parseDelimited(source, cursor, "{", "}");
    if (!argument) continue;
    const tildeOffset = i - 1;
    const hasNonBreakingPrefix =
      tildeOffset >= 0 && source[tildeOffset] === "~" && !isEscaped(source, tildeOffset);
    const mathRange = mathRanges.find(
      (range) => i >= range.from && i < range.to
    );
    commands.push({
      name,
      start: hasNonBreakingPrefix ? tildeOffset : i,
      commandStart: i,
      end: argument.end,
      argument: argument.value,
      options,
      hasNonBreakingPrefix,
      inMath: mathRange?.kind ?? null
    });
    i = argument.end - 1;
  }
  return commands;
}

export function validLabelKey(key: string): boolean {
  return key.length > 0 && !/[{}\\$\s]/u.test(key);
}
