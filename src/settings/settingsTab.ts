import { App, PluginSettingTab, Setting } from "obsidian";
import CBTExamPlugin from "../main";

export interface CBTSettings {
    saveHistory: boolean;
    showHistoryAfterExam: boolean;
}

export const DEFAULT_SETTINGS: CBTSettings = {
    saveHistory: true,
    showHistoryAfterExam: true
};

export class CBTSettingsTab extends PluginSettingTab {
    plugin: CBTExamPlugin;

    constructor(app: App, plugin: CBTExamPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl("h2", { text: "CBT Exam Simulator Settings" });

        new Setting(containerEl)
            .setName("Save Exam History")
            .setDesc("Automatically save exam results to a {quiz}-history.md file.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.saveHistory)
                .onChange(async (value) => {
                    this.plugin.settings.saveHistory = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Show History Button after Exam")
            .setDesc("Show 'View History' button in the results dashboard.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showHistoryAfterExam)
                .onChange(async (value) => {
                    this.plugin.settings.showHistoryAfterExam = value;
                    await this.plugin.saveSettings();
                }));
    }
}
