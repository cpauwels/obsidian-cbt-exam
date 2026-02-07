import * as React from "react";
import { App } from "obsidian";
import { ExamResult } from "../types/types";
import { HistoryManager } from "../exam/historyManager";
import { ConfirmModal } from "./ConfirmModal";

interface Props {
    app: App;
    sourcePath: string;
    onViewResult: (result: ExamResult) => void;
    onClose: () => void;
}

export const HistoryView: React.FC<Props> = ({ app, sourcePath, onViewResult, onClose }) => {
    const [history, setHistory] = React.useState<ExamResult[]>([]);
    const [loading, setLoading] = React.useState(true);
    const historyManager = React.useMemo(() => new HistoryManager(app), [app]);

    React.useEffect(() => {
        const loadHistory = async () => {
            try {
                const data = await historyManager.getHistory(sourcePath);
                setHistory(data);
            } catch (e) {
                console.error("Failed to load history:", e);
            } finally {
                setLoading(false);
            }
        };
        void loadHistory();
    }, [sourcePath, historyManager]);

    const handleDelete = (sessionId: string) => {
        new ConfirmModal(
            app,
            "Are you sure you want to delete this attempt? This action cannot be undone.",
            () => {
                void (async () => {
                    try {
                        await historyManager.deleteSession(sourcePath, sessionId);
                        setHistory(prev => prev.filter(res => res.sessionId !== sessionId));
                    } catch (e) {
                        console.error("Failed to delete history session:", e);
                    }
                })();
            }
        ).open();
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}m ${secs}s`;
    };

    if (loading) {
        return <div className="history-container u-text-center">Loading history...</div>;
    }

    return (
        <div className="history-container">
            <div className="history-header u-flex u-flex-justify-between u-flex-center u-mb-2">
                <h2>Exam History</h2>
                <button onClick={onClose} className="btn-secondary">Close</button>
            </div>

            {history.length === 0 ? (
                <div className="u-text-center u-text-muted u-mt-2">
                    <p>No history found for this quiz.</p>
                </div>
            ) : (
                <div className="history-list">
                    <table className="history-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Score</th>
                                <th>Duration</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((res) => (
                                <tr key={res.sessionId}>
                                    <td>{new Date(res.timestamp).toLocaleString()}</td>
                                    <td>{res.percentage.toFixed(1)}% ({res.totalScore}/{res.maxScore})</td>
                                    <td>{formatDuration(res.durationSeconds)}</td>
                                    <td className={res.isPass ? "results-status-pass" : "results-status-fail"}>
                                        {res.isPass ? "PASS" : "FAIL"}
                                    </td>
                                    <td className="u-flex u-flex-center u-gap-2">
                                        <button
                                            className="btn-info btn-small"
                                            onClick={() => onViewResult(res)}
                                        >
                                            View
                                        </button>
                                        <button
                                            className="btn-danger btn-small"
                                            onClick={() => void handleDelete(res.sessionId)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
