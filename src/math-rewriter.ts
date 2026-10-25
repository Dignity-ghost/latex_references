import { ReferenceIndex } from "./reference-index";
import { formatReference } from "./reference-format";

function mathText(value: string): string {
  const escaped = value.replace(/([{}%$#_&])/gu, "\\$1");
  return `\\text{${escaped}}`;
}

function insertTag(tex: string, number: string): string {
  if (/\\tag\s*\{/u.test(tex)) return tex;
  const tag = `\\tag{${number}}`;
  const environmentEnd =
    /\\end\s*\{(?:(?:align|alignat|flalign|gather|multline|equation)\*?)\}\s*$/u.exec(
      tex
    );
  if (environmentEnd?.index !== undefined) {
    return `${tex.slice(0, environmentEnd.index)}${tag}\n${tex.slice(environmentEnd.index)}`;
  }
  return `${tex}\n${tag}`;
}

export function rewriteMath(
  tex: string,
  display: boolean,
  index: ReferenceIndex
): string {
  const labels: string[] = [];
  let rewritten = tex.replace(/\\label\s*\{([^{}]*)\}/gu, (_match, key: string) => {
    labels.push(key.trim());
    return "";
  });

  rewritten = rewritten.replace(
    /\\(eqref|ref)\s*\{([^{}]*)\}/gu,
    (_match, command: string, rawKey: string) => {
      const key = rawKey.trim();
      const label = index.resolveLabel(key);
      const name = command === "eqref" ? "eqref" : "ref";
      return mathText(formatReference(name, label, key));
    }
  );

  if (!display || labels.length === 0) return rewritten;
  const label = index.resolveLabel(labels[0]);
  if (label?.kind !== "equation" || !label.number) return rewritten;
  return insertTag(rewritten, label.number);
}
