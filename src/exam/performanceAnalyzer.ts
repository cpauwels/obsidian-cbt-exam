import { ExamResult, Question, QuestionPerformance, QuestionCategory } from "../types/types";

/**
 * Pure computation module for analyzing per-question performance
 * from exam history and selecting adaptive study questions.
 */

// --- Classification ---

export function classifyQuestion(perf: QuestionPerformance): QuestionCategory {
    if (perf.totalAttempts === 0) return 'UNSEEN';
    if (perf.successRate === 0) return 'FAILED';

    // Streak is the strongest signal — consecutive correct answers demonstrate mastery
    // even if early attempts (unanswered/wrong) drag down the lifetime rate
    if (perf.streak >= 3) return 'MASTERED';
    if (perf.streak >= 2 && perf.successRate >= 0.5) return 'MASTERED';

    // High lifetime rate with some consistency
    if (perf.successRate >= 0.8 && perf.totalAttempts >= 2) return 'MASTERED';

    // Positive trend: recent correct or decent rate
    if (perf.streak >= 1 && perf.successRate >= 0.4) return 'IMPROVING';
    if (perf.successRate >= 0.5) return 'IMPROVING';

    return 'STRUGGLING';
}

// --- Aggregation ---

export function buildPerformanceIndex(
    history: ExamResult[],
    allQuestions: Question[]
): Map<string, QuestionPerformance> {
    const perfMap = new Map<string, QuestionPerformance>();

    // 1. Initialize entries for every question in the exam
    for (const q of allQuestions) {
        perfMap.set(q.id, {
            questionId: q.id,
            questionOrder: q.order ?? 0,
            totalAttempts: 0,
            correctCount: 0,
            incorrectCount: 0,
            unansweredCount: 0,
            successRate: -1, // sentinel for never-attempted
            lastAttemptCorrect: false,
            lastAttemptTimestamp: 0,
            streak: 0,
            category: 'UNSEEN',
        });
    }

    // 2. Sort history oldest → newest
    const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);

    // 3. Iterate through history and accumulate stats
    for (const attempt of sorted) {
        for (const qr of attempt.questionResults) {
            let perf = perfMap.get(qr.questionId);
            if (!perf) {
                // Question exists in history but not in current exam (orphan) — skip
                continue;
            }

            perf.totalAttempts++;

            if (qr.isCorrect) {
                perf.correctCount++;
                perf.streak++;
            } else if (qr.userAnswer.status === 'UNANSWERED') {
                perf.unansweredCount++;
                perf.streak = 0;
            } else {
                // ANSWERED but incorrect
                perf.incorrectCount++;
                perf.streak = 0;
            }

            perf.lastAttemptCorrect = qr.isCorrect;
            perf.lastAttemptTimestamp = attempt.timestamp;

            // Recompute success rate
            perf.successRate = perf.correctCount / perf.totalAttempts;

            // Set in map (reference mutation, but explicit for clarity)
            perfMap.set(qr.questionId, perf);
        }
    }

    // 4. Classify each question
    for (const [id, perf] of perfMap) {
        perf.category = classifyQuestion(perf);
        perfMap.set(id, perf);
    }

    return perfMap;
}

// --- Adaptive Selection ---

export interface AdaptiveSelection {
    questions: Question[];
    improvableCount: number;
    masteredCount: number;
    allMastered: boolean;
    noHistory: boolean;
}

export function selectAdaptiveQuestions(
    allQuestions: Question[],
    performanceMap: Map<string, QuestionPerformance>,
    mixRatio: number = 0.7 // proportion of improvable questions
): AdaptiveSelection {
    // Check if there's any history at all
    const hasHistory = Array.from(performanceMap.values()).some(p => p.totalAttempts > 0);
    if (!hasHistory) {
        return {
            questions: [],
            improvableCount: 0,
            masteredCount: 0,
            allMastered: false,
            noHistory: true,
        };
    }

    // Separate questions into improvable and mastered
    const improvable: Question[] = [];
    const mastered: Question[] = [];

    for (const q of allQuestions) {
        const perf = performanceMap.get(q.id);
        if (!perf || perf.category !== 'MASTERED') {
            improvable.push(q);
        } else {
            mastered.push(q);
        }
    }

    // All mastered?
    if (improvable.length === 0) {
        return {
            questions: [],
            improvableCount: 0,
            masteredCount: mastered.length,
            allMastered: true,
            noHistory: false,
        };
    }

    // Sort improvable by successRate ASC, then lastAttemptTimestamp ASC (oldest first)
    improvable.sort((a, b) => {
        const pa = performanceMap.get(a.id);
        const pb = performanceMap.get(b.id);
        if (!pa || !pb) return 0;
        // -1 (unseen) should go after 0 (failed) in sorting — treat unseen as 0.5 level
        const rateA = pa.successRate === -1 ? 0.5 : pa.successRate;
        const rateB = pb.successRate === -1 ? 0.5 : pb.successRate;
        if (rateA !== rateB) return rateA - rateB;
        return pa.lastAttemptTimestamp - pb.lastAttemptTimestamp;
    });

    // Calculate how many mastered questions to include
    const masteredRatio = 1 - mixRatio;
    let masteredCount = Math.ceil(improvable.length * masteredRatio / mixRatio);
    masteredCount = Math.min(masteredCount, mastered.length);

    // Ensure minimum of 5 total questions
    const MIN_QUESTIONS = 5;
    if (improvable.length + masteredCount < MIN_QUESTIONS) {
        masteredCount = Math.min(MIN_QUESTIONS - improvable.length, mastered.length);
    }

    // Sort mastered by lowest streak first, then random
    mastered.sort((a, b) => {
        const pa = performanceMap.get(a.id);
        const pb = performanceMap.get(b.id);
        if (!pa || !pb) return 0;
        if (pa.streak !== pb.streak) return pa.streak - pb.streak;
        return Math.random() - 0.5;
    });

    const selectedMastered = mastered.slice(0, masteredCount);

    // Combine and shuffle
    const combined = [...improvable, ...selectedMastered];
    shuffleArray(combined);

    return {
        questions: combined,
        improvableCount: improvable.length,
        masteredCount: selectedMastered.length,
        allMastered: false,
        noHistory: false,
    };
}

// --- Utility ---

export function getPerformanceSummary(performanceMap: Map<string, QuestionPerformance>): {
    mastered: number;
    improving: number;
    struggling: number;
    failed: number;
    unseen: number;
    total: number;
    masteryPercent: number;
} {
    let mastered = 0, improving = 0, struggling = 0, failed = 0, unseen = 0;

    for (const perf of performanceMap.values()) {
        switch (perf.category) {
            case 'MASTERED': mastered++; break;
            case 'IMPROVING': improving++; break;
            case 'STRUGGLING': struggling++; break;
            case 'FAILED': failed++; break;
            case 'UNSEEN': unseen++; break;
        }
    }

    const total = performanceMap.size;
    const masteryPercent = total > 0 ? Math.round((mastered / total) * 100) : 0;

    return { mastered, improving, struggling, failed, unseen, total, masteryPercent };
}

function shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
