import * as React from "react";
import { App, Notice } from "obsidian";
import { ExamDefinition, ExamSession, UserAnswerState, ExamResult, Question, QuestionPerformance } from "../types/types";
import { CBTSettings } from "../settings/settingsTab";
import { ExamSessionManager } from "../exam/examSession";
import { ScoringEngine } from "../exam/scoringEngine";
import { HistoryManager } from "../exam/historyManager";
import { TimerDisplay } from "./components/Timer";
import { QuestionNav } from "./components/QuestionNav";
import { ResultsView } from "./ResultsView";
import { buildPerformanceIndex, selectAdaptiveQuestions } from "../exam/performanceAnalyzer";
import { PerformanceManager } from "../exam/performanceManager";
import { Target, CheckCircle2 } from "lucide-react";

// Types
import { MultipleChoice } from "./questions/MultipleChoice";
import { SelectAll } from "./questions/SelectAll";
import { TrueFalse } from "./questions/TrueFalse";
import { Matching } from "./questions/Matching";
import { FillInBlank } from "./questions/FillInBlank";
import { ShortLongAnswer } from "./questions/ShortLongAnswer";
import { HistoryView } from "./HistoryView";
import { LandingView } from "./LandingView";
import { ConfirmModal } from "./ConfirmModal";

export const ExamUI: React.FC<{ definition: ExamDefinition, onClose: () => void, app: App, sourcePath?: string, settings: CBTSettings }> = ({ definition, onClose, app, sourcePath, settings }) => {
    // We use a ref to hold the manager, but state to force re-renders
    const managerRef = React.useRef(new ExamSessionManager(definition));
    const [session, setSession] = React.useState<ExamSession>(managerRef.current.getSession());
    const [result, setResult] = React.useState<ExamResult | null>(null);
    const [showCurrentAnswer, setShowCurrentAnswer] = React.useState(false); // New state for showing answer
    const [showHistory, setShowHistory] = React.useState(false);
    const historyManager = React.useMemo(() => new HistoryManager(app), [app]);
    const performanceManager = React.useMemo(() => new PerformanceManager(app), [app]);

    // Adaptive study state
    const [performanceData, setPerformanceData] = React.useState<Map<string, QuestionPerformance> | null>(null);
    const [hasHistory, setHasHistory] = React.useState(false);
    const [previousPerformance, setPreviousPerformance] = React.useState<Map<string, QuestionPerformance> | null>(null);

    // Load performance data
    const loadPerformanceData = React.useCallback(async () => {
        if (!sourcePath) return;
        try {
            const history = await historyManager.getHistory(sourcePath);
            if (history.length > 0) {
                setHasHistory(true);
                const allQuestions = definition.fullQuestions || definition.questions;
                const perfMap = buildPerformanceIndex(history, allQuestions);
                setPerformanceData(perfMap);
                await performanceManager.writePerformanceData(sourcePath, perfMap);
            } else {
                setHasHistory(false);
                setPerformanceData(null);
            }
        } catch (e) {
            console.error("Failed to load performance data:", e);
        }
    }, [sourcePath, historyManager, performanceManager, definition]);

    React.useEffect(() => {
        void loadPerformanceData();
    }, [loadPerformanceData]);

    const handleSubmit = React.useCallback(async () => {
        // Calculate score
        const finalSession = managerRef.current.submit();
        setSession(finalSession);
        const res = ScoringEngine.calculateScore(finalSession);
        setResult(res);

        // Save session history if enabled
        if (sourcePath && settings.saveHistory) {
            try {
                await historyManager.saveSession(sourcePath, res);

                // Rebuild performance index after saving
                const history = await historyManager.getHistory(sourcePath);
                const allQuestions = definition.fullQuestions || definition.questions;
                const newPerfMap = buildPerformanceIndex(history, allQuestions);
                // Store previous performance for delta display
                setPreviousPerformance(performanceData);
                setPerformanceData(newPerfMap);
                await performanceManager.writePerformanceData(sourcePath, newPerfMap);
            } catch (e) {
                console.error("Failed to save exam history:", e);
            }
        }
    }, [sourcePath, historyManager, performanceManager, settings.saveHistory, definition, performanceData]);

    const handleStart = React.useCallback(() => {
        const s = managerRef.current.start();
        setSession(s);
    }, []);

    const handleStartWithValidation = React.useCallback(() => {
        const errors = definition.metadata.rangeErrors;
        if (errors && errors.length > 0) {
            const message = "The specified exam-range is invalid:\n\n" +
                errors.map(e => "• " + e).join("\n") +
                "\n\nWould you like to launch the FULL exam instead?";

            const modal = new ConfirmModal(
                app,
                message,
                () => {
                    // Start with full questions
                    const fullDefinition = {
                        ...definition,
                        questions: definition.fullQuestions || definition.questions
                    };
                    managerRef.current = new ExamSessionManager(fullDefinition);
                    const s = managerRef.current.start();
                    setSession(s);
                },
                () => {
                    // Do nothing, stay on landing page
                },
                "Exam range error",
                "Launch exam"
            );
            modal.open();
        } else {
            handleStart();
        }
    }, [definition, app, handleStart]);

    const handleStartAdaptive = React.useCallback(() => {
        if (!performanceData) return;

        const allQuestions = definition.fullQuestions || definition.questions;
        const selection = selectAdaptiveQuestions(allQuestions, performanceData, settings.adaptiveMixRatio);

        if (selection.noHistory) {
            new Notice("Take the exam at least once before using adaptive study.");
            return;
        }

        if (selection.allMastered) {
            const modal = new ConfirmModal(
                app,
                "All questions mastered! Great job!\n\nWould you like to take the full exam for reinforcement?",
                () => {
                    managerRef.current = new ExamSessionManager(definition);
                    const s = managerRef.current.start();
                    setSession(s);
                },
                () => { /* stay on landing */ },
                "All Mastered!",
                "Full Exam"
            );
            modal.open();
            return;
        }

        // Build adaptive ExamDefinition
        const adaptiveDefinition: ExamDefinition = {
            ...definition,
            questions: selection.questions,
            fullQuestions: allQuestions, // Keep reference to full set
        };

        // Store previous performance for delta display
        setPreviousPerformance(performanceData);

        managerRef.current = new ExamSessionManager(adaptiveDefinition, true);

        // Reset state for new session
        setResult(null);
        setShowCurrentAnswer(false);

        const s = managerRef.current.start();
        setSession(s);
    }, [definition, performanceData, settings.adaptiveMixRatio, app]);

    React.useEffect(() => {
        console.debug("ExamUI Mounted. Definition:", definition);
        // We no longer auto-start on mount to show the landing page
    }, [definition]);

    if (!session) {
        return <div>Initializing session...</div>;
    }

    const handleAnswer = (ans: Partial<UserAnswerState>) => {
        const qId = session.definition.questions[session.currentQuestionIndex].id;
        setSession(managerRef.current.answerQuestion(qId, ans));
    };

    const handleNavigate = (idx: number) => {
        setSession(managerRef.current.setIndex(idx));
        // Only reset "Show Answer" toggle if not in review mode
        if (session.status !== 'REVIEW') {
            setShowCurrentAnswer(false);
        }
    };



    const handleReview = (idx?: number) => {
        // Switch to review mode
        managerRef.current.setStatus('REVIEW');
        const targetIdx = typeof idx === 'number' ? idx : 0;
        setSession(managerRef.current.setIndex(targetIdx));
    };

    const handleRetake = () => {
        // For adaptive mode, re-run the selection algorithm to get fresh questions
        if (session.isAdaptive && performanceData) {
            handleStartAdaptive();
        } else {
            // Reset manager and session
            managerRef.current = new ExamSessionManager(definition);
            setSession(managerRef.current.getSession());
            setResult(null);
            setShowCurrentAnswer(false);
        }
    };

    // View Switching
    if (showHistory && sourcePath) {
        return (
            <HistoryView
                app={app}
                sourcePath={sourcePath}
                onViewResult={(res) => {
                    managerRef.current.loadFromResult(res);
                    setSession(managerRef.current.getSession());
                    setResult(res);
                    setShowHistory(false);
                }}
                onClose={() => {
                    setShowHistory(false);
                    void loadPerformanceData();
                }}
            />
        );
    }

    if (session.status === 'IDLE') {
        return (
            <LandingView
                definition={definition}
                onStart={handleStartWithValidation}
                onStartAdaptive={handleStartAdaptive}
                onViewHistory={() => setShowHistory(true)}
                onClose={onClose}
                performanceData={performanceData}
                hasHistory={hasHistory}
            />
        );
    }

    if (result && session.status !== 'REVIEW') {
        return (
            <ResultsView
                result={result}
                onClose={onClose}
                onReview={handleReview}
                onRetake={handleRetake}
                onShowHistory={() => setShowHistory(true)}
                showHistoryButton={settings.showHistoryAfterExam}
                isAdaptive={session.isAdaptive}
                previousPerformance={previousPerformance}
                currentPerformance={performanceData}
            />
        );
    }

    const currentQ = session.definition.questions[session.currentQuestionIndex];
    if (!currentQ) return <div>Loading...</div>; // Safety

    const currentAns = session.answers[currentQ.id];

    // Determine if we should show the result/answer for this question
    // in REVIEW mode, OR if the user clicked "Show Answer" (only allowed if not in review and enabled in metadata)
    const isReviewMode = session.status === 'REVIEW';
    const canShowAnswer = !isReviewMode && session.definition.metadata.showAnswer;
    const shouldShowResult = isReviewMode || showCurrentAnswer;

    const currentDefinition = session.definition;

    return (
        <div className="exam-ui-layout">
            {/* Header */}
            <div className="exam-header">
                <div className="u-flex u-flex-center u-flex-gap-1">
                    <div className="exam-title">{currentDefinition.title}</div>
                    {session.isAdaptive && (
                        <span className="adaptive-badge u-flex u-flex-center u-gap-1">
                            <Target size={16} /> Adaptive
                        </span>
                    )}
                </div>

                <div className="u-flex u-flex-center u-flex-gap-1">
                    {/* Show Answer Toggle - Only if enabled and not in review */}
                    {canShowAnswer && (
                        <button onClick={() => setShowCurrentAnswer(!showCurrentAnswer)}>
                            {showCurrentAnswer ? "Hide answer" : "Show answer"}
                        </button>
                    )}
                    {isReviewMode && result ? (
                        <span className="exam-timer u-bold">
                            Time Taken: {Math.floor(result.durationSeconds / 60)}:{(Math.floor(result.durationSeconds % 60)).toString().padStart(2, '0')}
                        </span>
                    ) : (
                        <TimerDisplay seconds={session.timeLimitSeconds} onExpire={() => { void handleSubmit(); }} />
                    )}
                    <button
                        aria-label="Quit Exam"
                        onClick={onClose}
                        className="btn-danger"
                    >
                        Quit
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="exam-body">
                <ValidationSummary questions={currentDefinition.questions} />

                <div className="question-count-container u-flex u-flex-center u-flex-justify-between">
                    <div className="question-count">
                        Question {session.currentQuestionIndex + 1} of {currentDefinition.questions.length}
                    </div>
                    <div
                        className={`question-mark-toggle ${currentAns?.isMarked ? 'is-marked' : ''} ${isReviewMode ? 'u-cursor-default' : ''}`}
                        onClick={() => !isReviewMode && setSession(managerRef.current.toggleMark(currentQ.id))}
                        title={isReviewMode ? (currentAns?.isMarked ? "Marked" : "") : (currentAns?.isMarked ? "Unmark question" : "Mark question")}
                    >
                        <CheckCircle2 size={20} />
                    </div>
                </div>

                {currentQ.errors && currentQ.errors.length > 0 && (
                    <div className="question-error-notice">
                        <strong>Invalid Question:</strong>
                        <ul className="u-margin-0 u-padding-left-1">
                            {currentQ.errors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {renderQuestion(currentQ, currentAns, handleAnswer, app, shouldShowResult)}
            </div>

            {/* Footer */}
            <div className="exam-footer">

                {/* Show Answer Toggle - Only if enabled and not in review */}


                <div className="u-flex u-flex-justify-between">
                    <button
                        onClick={() => handleNavigate(session.currentQuestionIndex - 1)}
                        disabled={session.currentQuestionIndex === 0}
                    >
                        Previous
                    </button>

                    {isReviewMode ? (
                        <button
                            className="mod-cta"
                            onClick={() => {
                                // To go back to results, we don't need to recalculate score if result is already there.
                                // But if we want to ensure freshness or simple flow:
                                setResult(ScoringEngine.calculateScore(session));
                                // And we need to exit review mode?
                                // Actually, ResultsView is shown if 'result' is there AND status != REVIEW.
                                // So we need to reset status to something else (e.g. SUBMITTED)?
                                // Let's just create a new session state that is SUBMITTED or IDLE?
                                // Or simpler: Just un-set review mode to SUBMITTED?
                                managerRef.current.setStatus('SUBMITTED');
                                setSession(managerRef.current.getSession());
                            }}
                        >
                            Exit review
                        </button>
                    ) : (
                        <button
                            className="mod-cta"
                            onClick={() => { void handleSubmit(); }}
                        >
                            Submit exam
                        </button>
                    )}

                    <button
                        onClick={() => handleNavigate(session.currentQuestionIndex + 1)}
                        disabled={session.currentQuestionIndex === currentDefinition.questions.length - 1}
                    >
                        Next
                    </button>
                </div>

                <div className="exam-nav-container">
                    <QuestionNav
                        total={currentDefinition.questions.length}
                        current={session.currentQuestionIndex}
                        answers={session.answers}
                        questionIds={currentDefinition.questions.map(q => q.id)}
                        onNavigate={handleNavigate}
                        examResult={result}
                    />
                </div>
            </div>
        </div>
    );
};

const ValidationSummary: React.FC<{ questions: Question[] }> = ({ questions }) => {
    const questionsWithErrors = questions.filter(q => q.errors && q.errors.length > 0);

    if (questionsWithErrors.length === 0) return null;

    return (
        <div className="exam-validation-summary">
            <div className="u-bold u-margin-bottom-0-5">Exam Source Warnings:</div>
            <ul className="u-margin-0 u-padding-left-1">
                {questionsWithErrors.map((q, idx) => (
                    <li key={idx}>
                        <span className="u-bold">Question {q.order ?? idx + 1}:</span>
                        <ul className="u-margin-0 u-padding-left-1">
                            {q.errors?.map((err, eIdx) => (
                                <li key={eIdx}>{err}</li>
                            ))}
                        </ul>
                    </li>
                ))}
            </ul>
        </div>
    );
};

function renderQuestion(
    q: Question,
    ans: UserAnswerState | undefined,
    onChange: (ans: Partial<UserAnswerState>) => void,
    app: App,
    showResult = false
): React.ReactNode {
    if (!q) return <div>Error: Question not found</div>;
    switch (q.type) {
        case 'MC': return <MultipleChoice question={q} answer={ans} onChange={onChange} showResult={showResult} app={app} />;
        case 'SATA': return <SelectAll question={q} answer={ans} onChange={onChange} showResult={showResult} app={app} />;
        case 'TF': return <TrueFalse question={q} answer={ans} onChange={onChange} showResult={showResult} app={app} />;
        case 'MATCH': return <Matching question={q} answer={ans} onChange={onChange} showResult={showResult} app={app} />;
        case 'FIB': return <FillInBlank question={q} answer={ans} onChange={onChange} showResult={showResult} app={app} />;
        case 'SA':
        case 'LA': return <ShortLongAnswer question={q} answer={ans} onChange={onChange} showResult={showResult} app={app} />;
        default: return <div>Unknown question type: {(q as Question).type}</div>;
    }
}
