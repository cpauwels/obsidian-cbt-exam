import * as React from "react";
import { ExamResult } from "../types/types";

interface Props {
    result: ExamResult;
    onClose: () => void;
    onReview: (index?: number) => void;
    onRetake: () => void;
}

export const ResultsView: React.FC<Props> = ({ result, onClose, onReview, onRetake }) => {
    return (
        <div className="results-container">
            <div className="results-header u-text-center u-mb-2">
                <h1 className="results-score-big">{Math.round(result.percentage)}%</h1>
                <h2 className={`u-mt-05 ${result.isPass ? 'results-status-pass' : 'results-status-fail'}`}>
                    {result.isPass ? "PASSED" : "FAILED"}
                </h2>
                <div className="u-text-muted">
                    Time: {Math.floor(result.durationSeconds / 60)}m {Math.floor(result.durationSeconds % 60)}s
                </div>
            </div>

            <div className="results-stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{result.questionResults.length}</div>
                    <div className="stat-label">Total Questions</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value results-status-pass">{result.questionResults.filter(q => q.isCorrect).length}</div>
                    <div className="stat-label">Correct</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value results-status-fail">{result.questionResults.filter(q => !q.isCorrect && q.userAnswer.status !== 'UNANSWERED').length}</div>
                    <div className="stat-label">Incorrect</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value u-text-muted">{result.questionResults.filter(q => q.userAnswer.status === 'UNANSWERED').length}</div>
                    <div className="stat-label">Unanswered</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{result.totalScore} / {result.maxScore}</div>
                    <div className="stat-label">Points</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{Math.round(result.percentage)}%</div>
                    <div className="stat-label">Accuracy</div>
                </div>
            </div>

            <div className="results-questions-list">
                <h3>Question Breakdown</h3>
                <div className="results-questions-grid">
                    {result.questionResults.map((qr, idx) => {
                        const status = qr.userAnswer.status === 'UNANSWERED' ? 'unanswered' : (qr.isCorrect ? 'correct' : 'incorrect');
                        return (
                            <div
                                key={idx}
                                className={`result-indicator ${status} u-cursor-pointer`}
                                title={`Question ${idx + 1}: ${status.charAt(0).toUpperCase() + status.slice(1)} - Click to review`}
                                onClick={() => onReview(idx)}
                            >
                                {qr.userAnswer.isMarked && (
                                    <div className="result-indicator-mark" title="Marked question">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" /></svg>
                                    </div>
                                )}
                                {idx + 1}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="results-actions-container">
                <button
                    onClick={() => onReview()}
                    className="button-large btn-info"
                >
                    Review Answers
                </button>
                <button
                    onClick={onRetake}
                    className="button-large btn-success"
                >
                    Retake Exam
                </button>
                <button
                    onClick={onClose}
                    className="button-large btn-primary"
                >
                    Close Exam
                </button>
            </div>
        </div>
    );
};
