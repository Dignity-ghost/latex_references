export interface SourceRange {
  from: number;
  to: number;
}

export function containsOffset(ranges: SourceRange[], offset: number): boolean {
  let low = 0;
  let high = ranges.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const range = ranges[middle];
    if (offset < range.from) {
      high = middle - 1;
    } else if (offset >= range.to) {
      low = middle + 1;
    } else {
      return true;
    }
  }
  return false;
}

export function mergeRanges(ranges: SourceRange[]): SourceRange[] {
  const sorted = ranges
    .filter((range) => range.to > range.from)
    .sort((a, b) => a.from - b.from || a.to - b.to);
  const merged: SourceRange[] = [];
  for (const range of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || range.from > previous.to) {
      merged.push({ ...range });
    } else {
      previous.to = Math.max(previous.to, range.to);
    }
  }
  return merged;
}

export function lineStarts(source: string): number[] {
  const starts = [0];
  for (let i = 0; i < source.length; i += 1) {
    if (source.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return starts;
}

export function offsetToLineCh(
  starts: number[],
  offset: number
): { line: number; ch: number } {
  let low = 0;
  let high = starts.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (starts[middle] <= offset) low = middle + 1;
    else high = middle - 1;
  }
  const line = Math.max(0, high);
  return { line, ch: offset - starts[line] };
}

export function isEscaped(source: string, offset: number): boolean {
  let slashCount = 0;
  for (let i = offset - 1; i >= 0 && source[i] === "\\"; i -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}
