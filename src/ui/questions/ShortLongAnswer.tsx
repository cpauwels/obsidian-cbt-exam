import * as React from "react";
import { App } from "obsidian";
import { TextAnswerQuestion, UserAnswerState } from "../../types/types";
import { MarkdownContent } from "../components/MarkdownContent";

interface Props {
    question: TextAnswerQuestion;
    answer: UserAnswerState;
    onChange: (ans: Partial<UserAnswerState>) => void;
    readOnly?: boolean;
    showResult?: boolean;
    app: App;
}

export const ShortLongAnswer: React.FC<Props> = ({ question, answer, onChange, readOnly, showResult, app }) => {
    const val = (answer.textInputs && answer.textInputs[0]) || "";

    const handleChange = (txt: string) => {
        onChange({ textInputs: [txt] });
    };

    const isLong = question.type === 'LA';

    return (
        <div className="question-text-answer">
            <div className="question-text u-mb-1">
                <MarkdownContent app={app} content={question.questionText} />
            </div>

            {isLong ? (
                <textarea
                    rows={6}
                    value={val}
                    disabled={readOnly || showResult}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder="Type your answer here..."
                    className="text-answer-textarea"
                />
            ) : (
                <input
                    type="text"
                    value={val}
                    disabled={readOnly || showResult}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder="Type your answer here..."
                    className="text-answer-input"
                />
            )}

            {showResult && question.correctAnswerText && (
                <div className="reference-answer-container">
                    <div className="reference-label">Correct Answer / Reference:</div>
                    <div className="u-pre-wrap">
                        <MarkdownContent app={app} content={question.correctAnswerText} />
                    </div>
                </div>
            )}
        </div>
    );
};

