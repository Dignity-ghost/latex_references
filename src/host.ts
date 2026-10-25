import { EditorView } from "@codemirror/view";
import { ReferenceIndex } from "./reference-index";
import { LatexReferencesSettings } from "./types";

export interface LatexReferencesHost {
  readonly settings: LatexReferencesSettings;
  readonly index: ReferenceIndex;
  resolveEditorPath(view: EditorView): string | null;
  updateLiveDocument(path: string, source: string): void;
  navigateToLabel(key: string, newPane: boolean): Promise<void>;
  navigateToCitation(key: string, newPane: boolean): Promise<void>;
}
