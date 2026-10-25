import { LabelRecord, ReferenceCommandName } from "./types";

type ReferenceName = Extract<ReferenceCommandName, "ref" | "eqref">;

export function formatReference(
  command: ReferenceName,
  label: LabelRecord | null,
  unresolvedKey: string
): string {
  if (!label) return `?${unresolvedKey.trim()}`;
  const value = label.number ?? label.key;
  return command === "eqref" || label.kind === "equation" ? `(${value})` : value;
}
