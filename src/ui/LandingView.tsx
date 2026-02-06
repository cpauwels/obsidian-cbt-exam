import * as React from "react";
import { ExamDefinition } from "../types/types";

interface Props {
    definition: ExamDefinition;
    onStart: () => void;
    onViewHistory: () => void;
    onClose: () => void;
}

export const LandingView: React.FC<Props> = ({ definition, onStart, onViewHistory, onClose }) => {
    return (
        <div className="landing-container">
            <div className="landing-content u-text-center">
                <button
                    onClick={onClose}
                    className="landing-close-button"
                    aria-label="Close"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <h1 className="landing-title">{definition.title}</h1>

                <div className="landing-stats u-mb-2">
                    <div className="stat-badge">
                        <span className="stat-label">Questions</span>
                        <span className="stat-value">{definition.questions.length}</span>
                    </div>
                    {definition.metadata.timeLimitMinutes ? (
                        <div className="stat-badge">
                            <span className="stat-label">Time Limit</span>
                            <span className="stat-value">{definition.metadata.timeLimitMinutes}m</span>
                        </div>
                    ) : null}
                </div>

                <div className="landing-description u-mb-2">
                    <p>Ready to test your knowledge? Choose an option below to begin.</p>
                </div>

                <div className="landing-actions u-flex u-flex-column u-flex-gap-1">
                    <button
                        className="button-large btn-success"
                        onClick={onStart}
                    >
                        Start New Exam
                    </button>
                    <button
                        className="button-large btn-secondary"
                        onClick={onViewHistory}
                    >
                        View Exam History
                    </button>
                </div>
            </div>
        </div>
    );
};
