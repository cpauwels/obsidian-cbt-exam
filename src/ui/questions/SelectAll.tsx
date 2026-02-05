import * as React from "react";
import { App } from "obsidian";
import { SelectAllQuestion, UserAnswerState } from "../../types/types";
import { MarkdownContent } from "../components/MarkdownContent";

interface Props {
    question: SelectAllQuestion;
    answer: UserAnswerState;
    onChange: (ans: Partial<UserAnswerState>) => void;
    readOnly?: boolean;
    showResult?: boolean;
    app: App;
}

export const SelectAll: React.FC<Props> = ({ question, answer, onChange, readOnly, showResult, app }) => {
    const safeAnswer = answer ?? { status: 'UNANSWERED', questionId: '' };
    const selectedIndices = new Set(safeAnswer.selectedOptionIndices || []);

    const toggle = (idx: number) => {
        if (readOnly || showResult) return;
        const newSet = new Set(selectedIndices);
        if (newSet.has(idx)) newSet.delete(idx);
        else newSet.add(idx);
        onChange({ selectedOptionIndices: Array.from(newSet).sort() });
    };

    return (
        <div className="question-sata">
            <div className="question-text u-mb-1">
                <MarkdownContent app={app} content={question.questionText} />
                <div className="question-help-text">
                    (Select all that apply)
                </div>
            </div>
            <div className="options-list">
                {question.options.map((opt, idx) => {
                    const isSelected = selectedIndices.has(idx);
                    const isCorrect = question.correctOptionIndices.includes(idx);

                    let statusClass = "";

                    if (showResult) {
                        // Correct option: Green
                        if (isCorrect) {
                            statusClass = "correct";
                        }
                        // Selected but wrong: Red
                        else if (isSelected && !isCorrect) {
                            statusClass = "incorrect";
                        }
                    } else if (isSelected) {
                        statusClass = "selected";
                    }

                    return (
                        <div
                            key={idx}
                            className={`option-item ${statusClass}`}
                            onClick={() => toggle(idx)}
                        >
                            <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                className="u-mr-05"
                            />
                            <span className="option-label">
                                {question.optionLabels ? question.optionLabels[idx] : String.fromCharCode(97 + idx) + ')'}
                            </span>
                            <div className="option-content">
                                <MarkdownContent app={app} content={opt} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

