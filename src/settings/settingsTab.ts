import { App, PluginSettingTab, Setting } from "obsidian";
import CBTExamPlugin from "../main";

export interface CBTSettings {
    saveHistory: boolean;
    showHistoryAfterExam: boolean;
    adaptiveMixRatio: number; // 0.0–1.0, proportion of improvable questions in adaptive mode
}

export const DEFAULT_SETTINGS: CBTSettings = {
    saveHistory: true,
    showHistoryAfterExam: true,
    adaptiveMixRatio: 0.7,
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

        new Setting(containerEl)
            .setName("History")
            .setHeading();

        new Setting(containerEl)
            .setName("Save exam history")
            .setDesc("Automatically save exam results to a {quiz}-history.md file.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.saveHistory)
                .onChange(async (value) => {
                    this.plugin.settings.saveHistory = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Show history button after exam")
            .setDesc("Show 'view history' button in the results dashboard.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showHistoryAfterExam)
                .onChange(async (value) => {
                    this.plugin.settings.showHistoryAfterExam = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Adaptive study")
            .setHeading();

        new Setting(containerEl)
            .setName("Weak question ratio")
            .setDesc(`Proportion of weak/unseen questions in adaptive mode (currently ${Math.round(this.plugin.settings.adaptiveMixRatio * 100)}%). The rest are mastered questions for reinforcement.`)
            .addSlider(slider => slider
                .setLimits(0.5, 0.9, 0.05)
                .setValue(this.plugin.settings.adaptiveMixRatio)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.adaptiveMixRatio = value;
                    await this.plugin.saveSettings();
                    this.display(); // Refresh to update description
                }));
    }
}
