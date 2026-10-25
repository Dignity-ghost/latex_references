import { EditorView } from "@codemirror/view";
import type { App } from "obsidian";
import { ReferenceIndex } from "./reference-index";
import type { LatexReferencesSettings } from "./types";

export interface LatexReferencesHost {
  readonly app: App;
  readonly settings: LatexReferencesSettings;
  readonly index: ReferenceIndex;
  resolveEditorPath(view: EditorView): string | null;
  updateLiveDocument(path: string, source: string): void;
  resolveFigureImagePath(path: string, sourcePath: string): string | null;
  navigateToLabel(key: string, newPane: boolean): Promise<void>;
  navigateToCitation(key: string, newPane: boolean): Promise<void>;
}
