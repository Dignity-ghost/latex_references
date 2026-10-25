import { EditorView } from "@codemirror/view";
import {
  MarkdownView,
  Notice,
  Plugin,
  TFile,
  WorkspaceLeaf
} from "obsidian";
import {
  createEditorExtension,
  refreshEditorDecorations
} from "./editor-extension";
import { LatexReferencesHost } from "./host";
import { MathJaxHook } from "./mathjax-hook";
import { createReadingPostProcessor } from "./reading-view";
import { ReferenceIndex } from "./reference-index";
import { LatexReferencesSettingTab } from "./settings";
import { LatexReferenceSuggest } from "./suggest";
import {
  DEFAULT_SETTINGS,
  LatexReferencesSettings,
  ParsedCommand
} from "./types";

export default class LatexReferencesPlugin
  extends Plugin
  implements LatexReferencesHost
{
  settings: LatexReferencesSettings = { ...DEFAULT_SETTINGS };
  index!: ReferenceIndex;
  private mathJaxHook: MathJaxHook | null = null;
  private modifyTimers = new Map<string, number>();
  private liveUpdateTimers = new Map<string, number>();

  async onload(): Promise<void> {
    await this.loadSettings();
    this.index = new ReferenceIndex(this.app);
    await this.index.initialize(this.settings.bibliographyPaths);

    const unsubscribe = this.index.subscribe(refreshEditorDecorations);
    this.register(unsubscribe);
    this.registerEditorExtension(createEditorExtension(this));
    this.registerMarkdownPostProcessor(createReadingPostProcessor(this));
    this.registerEditorSuggest(new LatexReferenceSuggest(this.app, this));
    this.registerExtensions(["bib"], "markdown");
    this.addSettingTab(new LatexReferencesSettingTab(this.app, this));

    this.registerVaultEvents();
    this.registerCommands();

    this.mathJaxHook = new MathJaxHook(this.index);
    try {
      const installed = await this.mathJaxHook.install();
      if (!installed) {
        console.warn("LaTeX References: MathJax is unavailable; text references still work.");
      }
    } catch (error) {
      console.error("LaTeX References: failed to install the MathJax integration.", error);
    }
  }

  onunload(): void {
    this.mathJaxHook?.uninstall();
    for (const timer of this.modifyTimers.values()) window.clearTimeout(timer);
    this.modifyTimers.clear();
    for (const timer of this.liveUpdateTimers.values()) window.clearTimeout(timer);
    this.liveUpdateTimers.clear();
  }

  async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as Partial<LatexReferencesSettings> | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved ?? {});
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    await this.index.setBibliographyPaths(this.settings.bibliographyPaths);
    refreshEditorDecorations();
  }

  resolveEditorPath(editorView: EditorView): string | null {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      if (!(leaf.view instanceof MarkdownView)) continue;
      // Obsidian's Editor abstraction intentionally does not type the CM6 instance.
      // @ts-expect-error cm is present for the current editor on desktop and mobile.
      if (leaf.view.editor.cm === editorView) return leaf.view.file?.path ?? null;
    }
    return null;
  }

  updateLiveDocument(path: string, source: string): void {
    const previous = this.liveUpdateTimers.get(path);
    if (previous !== undefined) window.clearTimeout(previous);
    const timer = window.setTimeout(() => {
      this.liveUpdateTimers.delete(path);
      this.index.updateTransient(path, source);
    }, 75);
    this.liveUpdateTimers.set(path, timer);
  }

  resolveFigureImagePath(path: string, sourcePath: string): string | null {
    const trimmed = path.trim().replace(/^\.\//u, "");
    if (!trimmed || /^(?:[A-Za-z][A-Za-z\d+.-]*:|\/\/)/u.test(trimmed)) return null;
    const hasExtension = /\.[A-Za-z\d]+$/u.test(trimmed);
    const candidates = hasExtension
      ? [trimmed]
      : [
          trimmed,
          ...[".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif", ".pdf"].map(
            (extension) => `${trimmed}${extension}`
          )
        ];
    const supportedExtensions = new Set([
      "png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "pdf"
    ]);
    for (const candidate of candidates) {
      const file = this.app.metadataCache.getFirstLinkpathDest(candidate, sourcePath);
      if (file && supportedExtensions.has(file.extension.toLowerCase())) return file.path;
    }
    return null;
  }

  async navigateToLabel(key: string, newPane: boolean): Promise<void> {
    const label = this.index.resolveLabel(key);
    if (!label) {
      new Notice(`Unresolved reference: ${key}`);
      return;
    }
    const file = this.app.vault.getAbstractFileByPath(label.path);
    if (!(file instanceof TFile)) {
      new Notice(`Reference target no longer exists: ${label.path}`);
      return;
    }
    await this.openAtLocation(
      file,
      label.line,
      label.ch,
      newPane,
      label.kind === "paragraph"
    );
  }

  async navigateToCitation(key: string, newPane: boolean): Promise<void> {
    const target = this.index.resolveCitation(key);
    if (!target) {
      new Notice(`Missing bibliography entry: ${key}`);
      return;
    }
    const path = target.notePath ?? target.entry.path;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice(`Citation target no longer exists: ${path}`);
      return;
    }
    const line = target.notePath ? 0 : target.entry.line;
    const ch = target.notePath ? 0 : target.entry.ch;
    await this.openAtLocation(file, line, ch, newPane, true);
  }

  private registerVaultEvents(): void {
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (!(file instanceof TFile)) return;
        if (file.extension !== "md" && file.extension !== "bib") return;
        const previous = this.modifyTimers.get(file.path);
        if (previous !== undefined) window.clearTimeout(previous);
        const timer = window.setTimeout(() => {
          this.modifyTimers.delete(file.path);
          void this.index.updateFile(file);
        }, 200);
        this.modifyTimers.set(file.path, timer);
      })
    );
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (file instanceof TFile) void this.index.updateFile(file);
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        this.cancelModify(file.path);
        this.index.removePath(file.path);
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        this.cancelModify(oldPath);
        if (file instanceof TFile) this.index.renamePath(file, oldPath);
      })
    );
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (file.extension === "md") void this.index.updateFile(file);
      })
    );
  }

  private registerCommands(): void {
    this.addCommand({
      id: "rebuild-index",
      name: "Rebuild reference index",
      callback: async () => {
        await this.index.refreshAll();
        new Notice("LaTeX reference index rebuilt.");
      }
    });
    this.addCommand({
      id: "validate-current-note",
      name: "Validate references in current note",
      callback: () => this.validateCurrentNote()
    });
  }

  private validateCurrentNote(): void {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("Open a Markdown note to validate its references.");
      return;
    }
    const documentIndex = this.index.getDocument(file.path);
    if (!documentIndex) {
      new Notice("The active file has not been indexed yet.");
      return;
    }
    const unresolvedReferences = documentIndex.commands.filter(
      (command: ParsedCommand) =>
        (command.name === "ref" || command.name === "eqref") &&
        !this.index.resolveLabel(command.argument.trim())
    ).length;
    const unresolvedCitations = documentIndex.citations.reduce(
      (count, citation) =>
        count + citation.keys.filter((key) => !this.index.resolveCitation(key)).length,
      0
    );
    const duplicateLabels = documentIndex.labels.filter((label) =>
      this.index.duplicateLabels().has(label.key)
    ).length;
    const problems =
      documentIndex.diagnostics.length +
      unresolvedReferences +
      unresolvedCitations +
      duplicateLabels;
    if (problems === 0) {
      new Notice("No reference problems found in the current note.");
      return;
    }
    new Notice(
      `Found ${problems} reference problem${problems === 1 ? "" : "s"}: ` +
        `${unresolvedReferences} unresolved reference(s), ` +
        `${unresolvedCitations} missing citation(s), ` +
        `${duplicateLabels} duplicate label(s), ` +
        `${documentIndex.diagnostics.length} syntax issue(s).`,
      8000
    );
  }

  private cancelModify(path: string): void {
    const timer = this.modifyTimers.get(path);
    if (timer !== undefined) window.clearTimeout(timer);
    this.modifyTimers.delete(path);
    const liveTimer = this.liveUpdateTimers.get(path);
    if (liveTimer !== undefined) window.clearTimeout(liveTimer);
    this.liveUpdateTimers.delete(path);
  }

  private async openAtLocation(
    file: TFile,
    line: number,
    ch: number,
    forceNewPane: boolean,
    moveCursor: boolean
  ): Promise<void> {
    const newPane = forceNewPane || this.settings.openLinksInNewPane;
    const leaf = this.app.workspace.getLeaf(newPane);
    try {
      await leaf.openFile(file, { eState: { line } });
      this.revealEditorLocation(leaf, line, ch, moveCursor);
    } catch (error) {
      console.error("LaTeX References: failed to open a reference target.", error);
      new Notice(`Could not open ${file.path}. The target is at line ${line + 1}.`);
    }
  }

  private revealEditorLocation(
    leaf: WorkspaceLeaf,
    line: number,
    ch: number,
    moveCursor: boolean
  ): void {
    if (!(leaf.view instanceof MarkdownView)) return;
    const editor = leaf.view.editor;
    const safeLine = Math.max(0, Math.min(line, editor.lineCount() - 1));
    const safeCh = Math.max(0, Math.min(ch, editor.getLine(safeLine).length));
    const position = { line: safeLine, ch: safeCh };
    if (moveCursor) editor.setCursor(position);
    editor.scrollIntoView({ from: position, to: position }, true);
    leaf.view.setEphemeralState({ line: safeLine });
  }
}
