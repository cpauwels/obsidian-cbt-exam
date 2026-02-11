import * as React from "react";
import { ExamDefinition, QuestionPerformance } from "../types/types";
import { getPerformanceSummary } from "../exam/performanceAnalyzer";
import {
    Play,
    Target,
    History,
    CheckCircle2,
    TrendingUp,
    AlertTriangle,
    XCircle,
    HelpCircle,
    X
} from "lucide-react";

interface Props {
    definition: ExamDefinition;
    onStart: () => void;
    onStartAdaptive: () => void;
    onViewHistory: () => void;
    onClose: () => void;
    performanceData: Map<string, QuestionPerformance> | null;
    hasHistory: boolean;
}

export const LandingView: React.FC<Props> = ({
    definition, onStart, onStartAdaptive, onViewHistory, onClose, performanceData, hasHistory
}) => {
    const summary = performanceData ? getPerformanceSummary(performanceData) : null;

    return (
        <div className="landing-container">
            <div className="landing-content u-text-center">
                <button
                    onClick={onClose}
                    className="landing-close-button"
                    aria-label="Close"
                >
                    <X size={24} />
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
                        className="button-large btn-success u-flex u-flex-center u-flex-justify-center u-gap-1"
                        onClick={onStart}
                    >
                        <Play size={20} /> Start New Exam
                    </button>
                    <button
                        className={`button-large btn-adaptive u-flex u-flex-center u-flex-justify-center u-gap-1 ${!hasHistory ? 'btn-disabled' : ''}`}
                        onClick={hasHistory ? onStartAdaptive : undefined}
                        disabled={!hasHistory}
                        title={!hasHistory ? "Take the exam at least once before using Adaptive Study" : "Focus on your weak points"}
                    >
                        <Target size={20} /> Adaptive Study
                    </button>
                    <button
                        className="button-large btn-secondary u-flex u-flex-center u-flex-justify-center u-gap-1"
                        onClick={onViewHistory}
                    >
                        <History size={20} /> View History
                    </button>
                </div>

                {/* Performance Summary Panel */}
                {summary && hasHistory && (
                    <div className="performance-summary u-mt-2">
                        <div className="performance-summary-title">Performance Summary</div>
                        <div className="performance-categories">
                            <div className="category-row">
                                <span className="category-badge mastered"><CheckCircle2 size={16} /></span>
                                <span className="category-label">Mastered</span>
                                <span className="category-count">{summary.mastered}</span>
                            </div>
                            <div className="category-row">
                                <span className="category-badge improving"><TrendingUp size={16} /></span>
                                <span className="category-label">Improving</span>
                                <span className="category-count">{summary.improving}</span>
                            </div>
                            <div className="category-row">
                                <span className="category-badge struggling"><AlertTriangle size={16} /></span>
                                <span className="category-label">Struggling</span>
                                <span className="category-count">{summary.struggling}</span>
                            </div>
                            <div className="category-row">
                                <span className="category-badge failed"><XCircle size={16} /></span>
                                <span className="category-label">Never Correct</span>
                                <span className="category-count">{summary.failed}</span>
                            </div>
                            <div className="category-row">
                                <span className="category-badge unseen"><HelpCircle size={16} /></span>
                                <span className="category-label">Unseen</span>
                                <span className="category-count">{summary.unseen}</span>
                            </div>
                        </div>
                        <div className="mastery-bar-container">
                            <div className="mastery-bar-label">
                                Overall Mastery: {summary.masteryPercent}%
                            </div>
                            <div className="mastery-bar-track">
                                <div
                                    className="mastery-bar-fill"
                                    style={{ width: `${summary.masteryPercent}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
