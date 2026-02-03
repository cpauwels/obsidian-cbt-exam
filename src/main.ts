import { Plugin, Notice, TFile } from "obsidian";
import { FlashQuizParser } from "./parser/flashquizParser";
import { ExamModal } from "./ui/ExamModal";

export default class CBTExamPlugin extends Plugin {
    onload() {
        // Register command to start exam
        this.addCommand({
            id: 'start-exam',
            name: 'Start exam from current file',
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    if (!checking) {
                        this.startExam(activeFile);
                    }
                    return true;
                }
                return false;
            }
        });

        this.addRibbonIcon('graduation-cap', 'Start CBT exam', () => {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                this.startExam(activeFile);
            } else {
                new Notice("Please open a quiz file first.");
            }
        });
    }

    async startExam(file: TFile) {
        try {
            // Read file content
            if (!file) return;
            const content = await this.app.vault.read(file);

            // Parse
            console.debug("Parsing content from", file.path);
            const examDefinition = FlashQuizParser.parse(content, file.path);
            console.debug("Parsed Definition:", examDefinition);

            if (examDefinition.questions.length === 0) {
                new Notice("No questions found in this file. Make sure to use @mc, @tf, etc.");
                return;
            }

            // Open Modal
            new ExamModal(this.app, examDefinition).open();

        } catch (e) {
            console.error("Failed to start exam:", e);
            new Notice("Failed to start exam. Check console for details.");
        }
    }

    onunload() {

    }
}
