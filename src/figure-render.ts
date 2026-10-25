import type { FigureRecord } from "./types";

export type FigurePathResolver = (path: string) => string | null;

function plainCaption(value: string): string {
  let result = value.replace(/\\label\s*\{[^{}]*\}/gu, "");
  const formatting = /\\(?:emph|textbf|textit|textrm|textsf|texttt)\s*\{([^{}]*)\}/gu;
  for (let pass = 0; pass < 4; pass += 1) {
    const next = result.replace(formatting, "$1");
    if (next === result) break;
    result = next;
  }
  return result
    .replace(/\\([%&#_$])/gu, "$1")
    .replace(/~/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function altText(value: string): string {
  return plainCaption(value)
    .replace(/\$([^$]*)\$/gu, "$1")
    .replace(/[[\]\\]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function escapedWikiPath(path: string): string {
  return path.replace(/\|/gu, "\\|").replace(/\]/gu, "%5D");
}

function escapedDestination(path: string): string {
  return path.replace(/>/gu, "%3E").replace(/\n/gu, "");
}

export function figureToMarkdown(
  figure: FigureRecord,
  resolvePath: FigurePathResolver
): string {
  const caption = figure.caption ? plainCaption(figure.caption) : "";
  const alt = altText(caption) || "Figure";
  const images = figure.graphics.map((graphic) => {
    const resolved = resolvePath(graphic.path);
    if (resolved) return `![[${escapedWikiPath(resolved)}]]`;
    return `![${alt}](<${escapedDestination(graphic.path)}>)`;
  });
  const captionPrefix = figure.number ? `Figure ${figure.number}.` : "";
  const captionLine = [captionPrefix, caption].filter(Boolean).join(" ");
  if (captionLine) images.push(`*${captionLine}*`);
  return images.join("\n\n");
}
