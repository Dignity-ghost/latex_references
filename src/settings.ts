import { App, PluginSettingTab, Setting } from "obsidian";
import LatexReferencesPlugin from "./main";

export class LatexReferencesSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: LatexReferencesPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Bibliography paths")
      .setDesc(
        "Optional vault-relative .bib files or folders, one per line. Leave empty to discover every .bib file. BibTeX code blocks in Markdown remain ordinary code and are not indexed."
      )
      .addTextArea((text) =>
        text
          .setPlaceholder("references/library.bib")
          .setValue(this.plugin.settings.bibliographyPaths)
          .onChange(async (value) => {
            this.plugin.settings.bibliographyPaths = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Render references")
      .setDesc("Render \\ref and \\eqref as navigable links in Live Preview and Reading view.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.renderReferences).onChange(async (value) => {
          this.plugin.settings.renderReferences = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Render citations")
      .setDesc("Render \\cite as numbered links to literature notes or BibTeX entries.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.renderCitations).onChange(async (value) => {
          this.plugin.settings.renderCitations = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Show label markers")
      .setDesc("Show a small pilcrow where a non-math \\label is hidden in rendered views.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showLabelMarkers).onChange(async (value) => {
          this.plugin.settings.showLabelMarkers = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Open links in a new pane")
      .setDesc("Open reference and citation targets in a new pane by default.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.openLinksInNewPane).onChange(async (value) => {
          this.plugin.settings.openLinksInNewPane = value;
          await this.plugin.saveSettings();
        })
      );
  }
}
