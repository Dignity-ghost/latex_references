export type ReferenceCommandName = "label" | "ref" | "eqref" | "cite";

export type LabelKind = "equation" | "figure" | "heading" | "paragraph";

export interface SourceLocation {
  offset: number;
  line: number;
  ch: number;
}

export interface ParsedCommand {
  name: ReferenceCommandName;
  /** Start of the whole replacement, including an immediately preceding ~. */
  start: number;
  /** Start of the backslash command. */
  commandStart: number;
  end: number;
  argument: string;
  options: string[];
  hasNonBreakingPrefix: boolean;
  inMath: "display" | "inline" | null;
}

export interface LabelRecord extends SourceLocation {
  key: string;
  path: string;
  kind: LabelKind;
  number: string | null;
  heading: string | null;
}

export interface CitationOccurrence extends SourceLocation {
  keys: string[];
  command: ParsedCommand;
}

export interface Diagnostic extends SourceLocation {
  code:
    | "duplicate-label"
    | "invalid-label"
    | "inline-math-label"
    | "display-math-label-without-environment"
    | "figure-missing-graphic";
  message: string;
  key?: string;
}

export interface DocumentIndex {
  path: string;
  labels: LabelRecord[];
  commands: ParsedCommand[];
  citations: CitationOccurrence[];
  citationNumbers: Map<string, number>;
  figures: FigureRecord[];
  diagnostics: Diagnostic[];
}

export interface FigureGraphic {
  from: number;
  to: number;
  path: string;
  options: string | null;
}

export interface FigureRecord {
  from: number;
  to: number;
  caption: string | null;
  labelKey: string | null;
  number: string | null;
  graphics: FigureGraphic[];
}

export interface BibEntry extends SourceLocation {
  key: string;
  type: string;
  fields: Record<string, string>;
  path: string;
  source: "bib-file";
}

export interface CitationTarget {
  entry: BibEntry;
  notePath: string | null;
}

export interface LatexReferencesSettings {
  bibliographyPaths: string;
  renderReferences: boolean;
  renderCitations: boolean;
  showLabelMarkers: boolean;
  openLinksInNewPane: boolean;
}

export const DEFAULT_SETTINGS: LatexReferencesSettings = {
  bibliographyPaths: "",
  renderReferences: true,
  renderCitations: true,
  showLabelMarkers: false,
  openLinksInNewPane: false
};
