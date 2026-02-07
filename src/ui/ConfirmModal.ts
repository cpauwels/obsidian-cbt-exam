import { App, Modal, ButtonComponent } from "obsidian";

export class ConfirmModal extends Modal {
    private message: string;
    private onConfirm: () => void;
    private onCancel?: () => void;

    constructor(app: App, message: string, onConfirm: () => void, onCancel?: () => void) {
        super(app);
        this.message = message;
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h3", { text: "Confirm action" });
        contentEl.createEl("p", { text: this.message });

        const buttonContainer = contentEl.createDiv({ cls: "u-flex u-gap-2 u-mt-2 u-flex-justify-end" });

        new ButtonComponent(buttonContainer)
            .setButtonText("Cancel")
            .onClick(() => {
                this.close();
                if (this.onCancel) this.onCancel();
            });

        new ButtonComponent(buttonContainer)
            .setButtonText("Confirm")
            .setWarning()
            .onClick(() => {
                this.close();
                this.onConfirm();
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
