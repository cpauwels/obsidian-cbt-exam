import * as React from "react";
import { App } from "obsidian";
import { MatchingQuestion, UserAnswerState } from "../../types/types";
import { MarkdownContent } from "../components/MarkdownContent";

interface Props {
    question: MatchingQuestion;
    answer: UserAnswerState;
    onChange: (ans: Partial<UserAnswerState>) => void;
    readOnly?: boolean;
    showResult?: boolean;
    app: App;
}

export const Matching: React.FC<Props> = ({ question, answer, onChange, readOnly, showResult, app }) => {
    // State for shuffled indices of the right column
    const [rightIndices, setRightIndices] = React.useState<number[]>([]);

    React.useEffect(() => {
        // Initialize or re-shuffle when question changes
        const indices = question.rightItems.map((_, i) => i);
        // Fisher-Yates shuffle
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        setRightIndices(indices);
    }, [question.id, question.rightItems]);

    const [selectedLeft, setSelectedLeft] = React.useState<number | null>(null);

    // Current pairs: from answer state
    const pairs = answer.matchedPairs || [];

    // Helpers to find connection
    const getRightForLeft = (lIdx: number) => pairs.find(p => p.l === lIdx)?.r;
    const getLeftForRight = (rIdx: number) => pairs.find(p => p.r === rIdx)?.l;

    const handleLeftClick = (idx: number) => {
        if (readOnly || showResult) return;
        // If already paired, unpair
        const existingRight = getRightForLeft(idx);
        if (existingRight !== undefined) {
            onChange({ matchedPairs: pairs.filter(p => p.l !== idx) });
            return;
        }
        setSelectedLeft(idx);
    };

    const handleRightClick = (dataIdx: number) => {
        if (readOnly || showResult) return;
        if (selectedLeft !== null) {
            // Pair them!
            // Remove any existing pairs for these items
            const newPairs = pairs.filter(p => p.l !== selectedLeft && p.r !== dataIdx);
            newPairs.push({ l: selectedLeft, r: dataIdx });
            onChange({ matchedPairs: newPairs });
            setSelectedLeft(null);
        } else {
            // If clicked right item is paired, unpair its left counterpart?
            const existingLeft = getLeftForRight(dataIdx);
            if (existingLeft !== undefined) {
                onChange({ matchedPairs: pairs.filter(p => p.l !== existingLeft) });
            }
        }
    };

    // If we haven't initialized shuffling yet (first render), render nothing or loading
    if (rightIndices.length !== question.rightItems.length) return null;

    return (
        <div className="question-matching">
            <div className="question-text u-mb-1">
                <MarkdownContent app={app} content={question.questionText} />
            </div>

            <div className="matching-columns">
                {/* Left Column */}
                <div className="matching-column left">
                    <div className="u-bold u-mb-05">Items</div>
                    {question.leftItems.map((item, idx) => {
                        const isSelected = selectedLeft === idx;
                        const isPaired = getRightForLeft(idx) !== undefined;

                        return (
                            <div
                                key={`l-${idx}`}
                                onClick={() => handleLeftClick(idx)}
                                className={`matching-item ${isSelected ? 'selected' : ''} ${isPaired ? 'paired' : ''} ${(readOnly || showResult) ? 'u-cursor-default' : 'u-cursor-pointer'}`}
                            >
                                <MarkdownContent app={app} content={item} />
                                {isPaired && <span className="badge left">{idx + 1}</span>}
                            </div>
                        );
                    })}
                </div>

                {/* Right Column */}
                <div className="matching-column right">
                    <div className="u-bold u-mb-05">Matches</div>
                    {rightIndices.map((dataIdx, visualIdx) => {
                        const item = question.rightItems[dataIdx];
                        const pairedLeft = getLeftForRight(dataIdx);
                        const isPaired = pairedLeft !== undefined;

                        // Correct logic: dataIdx should match Left[dataIdx]
                        const isCorrectPair = pairedLeft === dataIdx;

                        let statusClass = "";

                        if (showResult) {
                            if (isPaired) {
                                statusClass = isCorrectPair ? "correct" : "incorrect";
                            }
                        } else if (isPaired) {
                            statusClass = "paired";
                        }

                        return (
                            <div
                                key={`r-${visualIdx}-${dataIdx}`}
                                onClick={() => handleRightClick(dataIdx)}
                                className={`matching-item ${statusClass} ${(readOnly || showResult) ? 'u-cursor-default' : 'u-cursor-pointer'}`}
                            >
                                <MarkdownContent app={app} content={item} />

                                {/* User Badge */}
                                {isPaired && (
                                    <span className={`badge-user ${showResult && !isCorrectPair ? 'offset' : ''} ${showResult ? (isCorrectPair ? 'correct' : 'incorrect') : ''}`}>
                                        {pairedLeft + 1}
                                    </span>
                                )}

                                {/* Correct Answer Badge (Only shown in showResult/Review if user was wrong or didn't answer) */}
                                {showResult && !isCorrectPair && (
                                    <span className="badge-correct">
                                        {dataIdx + 1}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="u-mt-1 u-text-muted u-small">
                Select an item on the left, then click its match on the right.
            </div>
        </div>
    );
};

