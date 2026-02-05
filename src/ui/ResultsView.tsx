import * as React from "react";
import { ExamResult } from "../types/types";

interface Props {
    result: ExamResult;
    onClose: () => void;
    onReview: () => void;
}

export const ResultsView: React.FC<Props> = ({ result, onClose, onReview }) => {
    return (
        <div className="results-container">
            <div className="results-header u-text-center u-mb-2">
                <h1 className="results-score-big">{Math.round(result.percentage)}%</h1>
                <h2 className={`u-mt-05 ${result.isPass ? 'results-status-pass' : 'results-status-fail'}`}>
                    {result.isPass ? "PASSED" : "FAILED"}
                </h2>
                <div className="u-text-muted">
                    Score: {result.totalScore} / {result.maxScore} points • Time: {Math.floor(result.durationSeconds / 60)}m {Math.floor(result.durationSeconds % 60)}s
                </div>
            </div>

            <div className="results-questions-list">
                <h3>Question Breakdown</h3>
                {result.questionResults.map((qr, idx) => {
                    return (
                        <div
                            key={idx}
                            className={`result-card ${qr.isCorrect ? 'correct' : 'incorrect'}`}
                        >
                            <div className="u-bold u-mb-05">Question {idx + 1}</div>
                            <div>Status: <span className={qr.isCorrect ? 'results-status-pass' : 'results-status-fail'}>{qr.isCorrect ? "Correct" : "Incorrect"}</span></div>
                        </div>
                    );
                })}
            </div>

            <div className="results-actions-container">
                <button
                    onClick={onReview}
                    className="button-large"
                >
                    Review Answers
                </button>
                <button
                    onClick={onClose}
                    className="mod-cta button-large"
                >
                    Close Exam
                </button>
            </div>
        </div>
    );
};
