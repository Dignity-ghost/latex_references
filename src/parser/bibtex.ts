import { BibEntry } from "../types";
import { lineStarts, offsetToLineCh } from "./ranges";

function skipSpaceAndComments(source: string, start: number): number {
  let cursor = start;
  while (cursor < source.length) {
    if (/\s/.test(source[cursor])) {
      cursor += 1;
      continue;
    }
    if (source[cursor] === "%") {
      const newline = source.indexOf("\n", cursor + 1);
      cursor = newline === -1 ? source.length : newline + 1;
      continue;
    }
    break;
  }
  return cursor;
}

function readBalanced(
  source: string,
  start: number,
  open: string,
  close: string
): { value: string; end: number } | null {
  if (source[start] !== open) return null;
  let depth = 1;
  let quoted = false;
  for (let i = start + 1; i < source.length; i += 1) {
    const escaped = source[i - 1] === "\\";
    if (source[i] === '"' && !escaped) quoted = !quoted;
    if (quoted || escaped) continue;
    if (source[i] === open) depth += 1;
    if (source[i] === close) depth -= 1;
    if (depth === 0) return { value: source.slice(start + 1, i), end: i + 1 };
  }
  return null;
}

function splitTopLevel(source: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let braceDepth = 0;
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const escaped = source[i - 1] === "\\";
    if (source[i] === '"' && !escaped) quoted = !quoted;
    if (quoted || escaped) continue;
    if (source[i] === "{") braceDepth += 1;
    if (source[i] === "}") braceDepth -= 1;
    if (source[i] === "," && braceDepth === 0) {
      parts.push(source.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(source.slice(start));
  return parts;
}

function unwrapValue(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parseFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const part of splitTopLevel(body)) {
    const equals = part.indexOf("=");
    if (equals === -1) continue;
    const name = part.slice(0, equals).trim().toLowerCase();
    if (!name) continue;
    fields[name] = unwrapValue(part.slice(equals + 1));
  }
  return fields;
}

export function parseBibTeX(
  source: string,
  path: string,
  sourceKind: BibEntry["source"] = "bib-file",
  baseOffset = 0
): BibEntry[] {
  const entries: BibEntry[] = [];
  const starts = lineStarts(source);
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] !== "@") continue;
    const typeMatch = /^@([A-Za-z]+)\s*/.exec(source.slice(i));
    if (!typeMatch) continue;
    const type = typeMatch[1].toLowerCase();
    if (type === "comment" || type === "preamble" || type === "string") continue;
    let cursor = skipSpaceAndComments(source, i + typeMatch[0].length);
    const open = source[cursor];
    if (open !== "{" && open !== "(") continue;
    const close = open === "{" ? "}" : ")";
    const entry = readBalanced(source, cursor, open, close);
    if (!entry) continue;
    const comma = entry.value.indexOf(",");
    if (comma === -1) continue;
    const key = entry.value.slice(0, comma).trim();
    if (!key) continue;
    const location = offsetToLineCh(starts, i);
    entries.push({
      key,
      type,
      fields: parseFields(entry.value.slice(comma + 1)),
      path,
      source: sourceKind,
      offset: baseOffset + i,
      line: location.line,
      ch: location.ch
    });
    i = entry.end - 1;
  }
  return entries;
}
