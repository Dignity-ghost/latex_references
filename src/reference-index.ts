import { App, normalizePath, TFile } from "obsidian";
import { BibEntry, CitationTarget, DocumentIndex, LabelRecord } from "./types";
import { parseBibTeX } from "./parser/bibtex";
import { parseMarkdownStructure } from "./parser/markdown";
import { lineStarts, offsetToLineCh } from "./parser/ranges";
import { scanMarkdown } from "./parser/scanner";

type IndexListener = () => void;

function settingPaths(value: string): string[] {
  return value
    .split(/\r?\n|;/u)
    .map((path) => path.trim())
    .filter(Boolean)
    .map((path) => normalizePath(path.replace(/^\.\//u, "")));
}

function frontmatterKeys(value: unknown): string[] {
  if (typeof value === "string") return [value.trim()].filter(Boolean);
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").map((item) => item.trim());
  }
  return [];
}

export class ReferenceIndex {
  private readonly documents = new Map<string, DocumentIndex>();
  private readonly sources = new Map<string, string>();
  private readonly bibEntriesByPath = new Map<string, BibEntry[]>();
  private readonly labelMap = new Map<string, LabelRecord>();
  private readonly duplicateLabelMap = new Map<string, LabelRecord[]>();
  private readonly bibMap = new Map<string, BibEntry>();
  private readonly duplicateBibMap = new Map<string, BibEntry[]>();
  private readonly noteByCiteKey = new Map<string, string>();
  private readonly listeners = new Set<IndexListener>();
  private bibliographyPaths = "";
  private generation = 0;

  constructor(private readonly app: App) {}

  get version(): number {
    return this.generation;
  }

  async initialize(bibliographyPaths: string): Promise<void> {
    this.bibliographyPaths = bibliographyPaths;
    const files = this.app.vault.getFiles().sort((a, b) => a.path.localeCompare(b.path));
    await this.readFiles(
      files.filter((file) => file.extension === "md" || file.extension === "bib")
    );
    this.rebuildDerivedState();
  }

  async setBibliographyPaths(value: string): Promise<void> {
    if (value === this.bibliographyPaths) return;
    this.bibliographyPaths = value;
    const bibFiles = this.app.vault
      .getFiles()
      .filter((file) => file.extension === "bib")
      .sort((a, b) => a.path.localeCompare(b.path));
    await this.readFiles(bibFiles);
    this.rebuildDerivedState();
  }

  async refreshAll(): Promise<void> {
    this.documents.clear();
    this.sources.clear();
    this.bibEntriesByPath.clear();
    await this.initialize(this.bibliographyPaths);
  }

  async updateFile(file: TFile): Promise<void> {
    if (file.extension !== "md" && file.extension !== "bib") return;
    await this.readFile(file, true);
  }

  removePath(path: string): void {
    const removedDocument = this.documents.delete(path);
    const removedSource = this.sources.delete(path);
    const removedBibliography = this.bibEntriesByPath.delete(path);
    const changed = removedDocument || removedSource || removedBibliography;
    if (changed) this.rebuildDerivedState();
  }

  renamePath(file: TFile, oldPath: string): void {
    this.documents.delete(oldPath);
    this.sources.delete(oldPath);
    this.bibEntriesByPath.delete(oldPath);
    void this.updateFile(file);
  }

  updateTransient(path: string, source: string): void {
    const previous = this.sources.get(path);
    if (previous === source) return;
    this.sources.set(path, source);
    if (path.toLowerCase().endsWith(".bib")) {
      this.documents.delete(path);
      this.bibEntriesByPath.set(
        path,
        this.bibFileAllowed(path) ? parseBibTeX(source, path) : []
      );
    } else {
      this.documents.set(path, scanMarkdown(source, path));
      this.bibEntriesByPath.set(path, this.bibEntriesFromMarkdown(source, path));
    }
    this.rebuildDerivedState();
  }

  subscribe(listener: IndexListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getDocument(path: string): DocumentIndex | null {
    return this.documents.get(path) ?? null;
  }

  getSource(path: string): string | null {
    return this.sources.get(path) ?? null;
  }

  resolveLabel(key: string): LabelRecord | null {
    return this.labelMap.get(key) ?? null;
  }

  labelKeys(): string[] {
    return [...this.labelMap.keys()].sort((a, b) => a.localeCompare(b));
  }

  duplicateLabels(): ReadonlyMap<string, LabelRecord[]> {
    return this.duplicateLabelMap;
  }

  resolveCitation(key: string): CitationTarget | null {
    const entry = this.bibMap.get(key);
    if (!entry) return null;
    const notePath =
      this.noteByCiteKey.get(key) ??
      (entry.source === "bibtex-block" && entry.path.endsWith(".md") ? entry.path : null);
    return { entry, notePath };
  }

  citationKeys(): string[] {
    return [...this.bibMap.keys()].sort((a, b) => a.localeCompare(b));
  }

  duplicateCitations(): ReadonlyMap<string, BibEntry[]> {
    return this.duplicateBibMap;
  }

  private async readFile(file: TFile, notify: boolean): Promise<void> {
    const source = await this.app.vault.cachedRead(file);
    this.sources.set(file.path, source);
    if (file.extension === "md") {
      this.documents.set(file.path, scanMarkdown(source, file.path));
      this.bibEntriesByPath.set(file.path, this.bibEntriesFromMarkdown(source, file.path));
    } else if (file.extension === "bib") {
      this.bibEntriesByPath.set(
        file.path,
        this.bibFileAllowed(file.path) ? parseBibTeX(source, file.path) : []
      );
    }
    if (notify) this.rebuildDerivedState();
  }

  private async readFiles(files: TFile[]): Promise<void> {
    let cursor = 0;
    const workerCount = Math.min(8, files.length);
    const workers = Array.from({ length: workerCount }, async () => {
      while (cursor < files.length) {
        const file = files[cursor];
        cursor += 1;
        await this.readFile(file, false);
      }
    });
    await Promise.all(workers);
  }

  private bibFileAllowed(path: string): boolean {
    const configured = settingPaths(this.bibliographyPaths);
    if (configured.length === 0) return true;
    return configured.some(
      (candidate) => path === candidate || path.startsWith(`${candidate.replace(/\/$/u, "")}/`)
    );
  }

  private bibEntriesFromMarkdown(source: string, path: string): BibEntry[] {
    const structure = parseMarkdownStructure(source);
    const starts = lineStarts(source);
    return structure.bibtexBlocks.flatMap((range) =>
      parseBibTeX(source.slice(range.from, range.to), path, "bibtex-block", range.from).map(
        (entry) => {
          const location = offsetToLineCh(starts, entry.offset);
          return { ...entry, ...location };
        }
      )
    );
  }

  private rebuildDerivedState(): void {
    this.labelMap.clear();
    this.duplicateLabelMap.clear();
    this.bibMap.clear();
    this.duplicateBibMap.clear();
    this.noteByCiteKey.clear();

    const labelsByKey = new Map<string, LabelRecord[]>();
    for (const document of [...this.documents.values()].sort((a, b) => a.path.localeCompare(b.path))) {
      for (const label of document.labels) {
        const records = labelsByKey.get(label.key) ?? [];
        records.push(label);
        labelsByKey.set(label.key, records);
      }
    }
    for (const [key, records] of labelsByKey) {
      records.sort((a, b) => a.path.localeCompare(b.path) || a.offset - b.offset);
      this.labelMap.set(key, records[0]);
      if (records.length > 1) this.duplicateLabelMap.set(key, records);
    }

    const bibByKey = new Map<string, BibEntry[]>();
    for (const [path, entries] of [...this.bibEntriesByPath].sort(([a], [b]) => a.localeCompare(b))) {
      if (path.endsWith(".bib") && !this.bibFileAllowed(path)) continue;
      for (const entry of entries) {
        const records = bibByKey.get(entry.key) ?? [];
        records.push(entry);
        bibByKey.set(entry.key, records);
      }
    }
    for (const [key, records] of bibByKey) {
      records.sort((a, b) => a.path.localeCompare(b.path) || a.offset - b.offset);
      this.bibMap.set(key, records[0]);
      if (records.length > 1) this.duplicateBibMap.set(key, records);
    }

    for (const file of this.app.vault.getMarkdownFiles()) {
      const cache = this.app.metadataCache.getFileCache(file);
      const frontmatter = cache?.frontmatter;
      const keys = [
        ...frontmatterKeys(frontmatter?.citekey),
        ...frontmatterKeys(frontmatter?.citationKey),
        ...frontmatterKeys(frontmatter?.["citation-key"]),
        ...frontmatterKeys(frontmatter?.["bibtex-key"])
      ];
      if (file.basename.startsWith("@")) keys.push(file.basename.slice(1));
      if (this.bibMap.has(file.basename)) keys.push(file.basename);
      for (const key of keys) {
        if (key && !this.noteByCiteKey.has(key)) this.noteByCiteKey.set(key, file.path);
      }
    }

    this.generation += 1;
    for (const listener of this.listeners) listener();
  }
}
