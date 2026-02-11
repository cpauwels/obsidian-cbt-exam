import * as React from "react";
import { ExamResult, QuestionPerformance } from "../types/types";
import { classifyQuestion } from "../exam/performanceAnalyzer";
import {
    PartyPopper,
    Dumbbell,
    CheckCircle2,
    TrendingUp,
    AlertTriangle,
    XCircle,
    HelpCircle,
    ArrowRight
} from "lucide-react";

interface Props {
    result: ExamResult;
    onClose: () => void;
    onReview: (index?: number) => void;
    onRetake: () => void;
    onShowHistory: () => void;
    showHistoryButton?: boolean;
    isAdaptive?: boolean;
    previousPerformance?: Map<string, QuestionPerformance> | null;
    currentPerformance?: Map<string, QuestionPerformance> | null;
}

export const ResultsView: React.FC<Props> = ({
    result, onClose, onReview, onRetake, onShowHistory,
    showHistoryButton = true, isAdaptive, previousPerformance, currentPerformance
}) => {
    // Calculate adaptive encouragement data
    const adaptiveStats = React.useMemo(() => {
        if (!isAdaptive || !previousPerformance || !currentPerformance) return null;

        let improved = 0;
        let totalWeak = 0;
        const movements: { questionId: string; from: string; to: string }[] = [];

        for (const qr of result.questionResults) {
            const prev = previousPerformance.get(qr.questionId);
            const curr = currentPerformance.get(qr.questionId);
            if (!prev || !curr) continue;

            const prevCategory = prev.category;
            const currCategory = classifyQuestion(curr);

            if (prevCategory !== 'MASTERED') {
                totalWeak++;
                // Check if improved (moved to a better category)
                const order = ['FAILED', 'UNSEEN', 'STRUGGLING', 'IMPROVING', 'MASTERED'];
                const prevIdx = order.indexOf(prevCategory);
                const currIdx = order.indexOf(currCategory);
                if (currIdx > prevIdx) {
                    improved++;
                    movements.push({ questionId: qr.questionId, from: prevCategory, to: currCategory });
                }
            }
        }

        // Aggregate movements by type to avoid spamming
        const movementCounts = new Map<string, number>();
        for (const m of movements) {
            const key = `${m.from}|${m.to}`;
            movementCounts.set(key, (movementCounts.get(key) || 0) + 1);
        }

        const aggregatedMovements: { from: string; to: string; count: number }[] = [];
        movementCounts.forEach((count, key) => {
            const [from, to] = key.split('|');
            aggregatedMovements.push({ from, to, count });
        });

        // Sort by count DESC
        aggregatedMovements.sort((a, b) => b.count - a.count);

        return { improved, totalWeak, aggregatedMovements };
    }, [isAdaptive, previousPerformance, currentPerformance, result]);

    return (
        <div className="results-container">
            {/* Adaptive Encouragement */}
            {isAdaptive && adaptiveStats && (
                <div className="adaptive-encouragement">
                    <div className="adaptive-encouragement-emoji">
                        {adaptiveStats.improved > 0 ? <PartyPopper size={48} /> : <Dumbbell size={48} />}
                    </div>
                    <div className="adaptive-encouragement-text">
                        {adaptiveStats.improved > 0
                            ? `You improved on ${adaptiveStats.improved}/${adaptiveStats.totalWeak} weak questions!`
                            : 'Keep practicing — improvement takes time!'
                        }
                    </div>
                    {adaptiveStats.aggregatedMovements.length > 0 && (
                        <div className="adaptive-encouragement-detail">
                            {adaptiveStats.aggregatedMovements.map((m, i) => {
                                const categoryIcon: Record<string, React.ReactNode> = {
                                    'MASTERED': <CheckCircle2 size={16} className="icon-success" />,
                                    'IMPROVING': <TrendingUp size={16} className="icon-info" />,
                                    'STRUGGLING': <AlertTriangle size={16} className="icon-warning" />,
                                    'FAILED': <XCircle size={16} className="icon-error" />,
                                    'UNSEEN': <HelpCircle size={16} className="icon-muted" />
                                };
                                return (
                                    <span key={i} className="adaptive-movement-pill">
                                        {m.count > 1 && <span className="count-badge">{m.count}x</span>}
                                        {categoryIcon[m.from]}
                                        <ArrowRight size={14} className="u-text-muted" />
                                        {categoryIcon[m.to]}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <div className="results-header u-text-center u-mb-2">
                <h1 className="results-score-big">{Math.round(result.percentage)}%</h1>
                <h2 className={`u-mt-05 ${result.isPass ? 'results-status-pass' : 'results-status-fail'}`}>
                    {result.isPass ? "PASSED" : "FAILED"}
                </h2>
                {isAdaptive && (
                    <div className="u-mt-05">
                        <span className="adaptive-badge">🎯 Adaptive Study</span>
                    </div>
                )}
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
                    className={`button-large ${isAdaptive ? 'btn-adaptive' : 'btn-success'}`}
                >
                    {isAdaptive ? '🎯 Retake Adaptive' : 'Retake Exam'}
                </button>
                {showHistoryButton && (
                    <button
                        onClick={onShowHistory}
                        className="button-large btn-secondary"
                    >
                        View History
                    </button>
                )}
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
