import type { Question } from "./quiz";

// localStorage "shuffle bag": every question is shown once before any repeat.
// When the unseen pool empties, the cycle resets automatically.

const SEEN_KEY = "quizme:seen";
const SCORE_KEY = "quizme:score";

// Running tally, persisted until the user resets. `answered` counts every
// submitted question; `correct` counts the fully-correct ones.
export interface Score {
  correct: number;
  answered: number;
}

const ZERO_SCORE: Score = { correct: 0, answered: 0 };

export function loadScore(): Score {
  if (typeof window === "undefined") return { ...ZERO_SCORE };
  try {
    const raw = window.localStorage.getItem(SCORE_KEY);
    if (!raw) return { ...ZERO_SCORE };
    const s = JSON.parse(raw) as Partial<Score>;
    return {
      correct: Number(s.correct) || 0,
      answered: Number(s.answered) || 0,
    };
  } catch {
    return { ...ZERO_SCORE };
  }
}

export function saveScore(score: Score): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SCORE_KEY, JSON.stringify(score));
  } catch {
    // ignore
  }
}

export function resetScore(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SCORE_KEY);
  } catch {
    // ignore
  }
}

export function loadSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw) as string[];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

export function saveSeen(seen: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    // storage full / unavailable — non-fatal for a study tool
  }
}

export function resetSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SEEN_KEY);
  } catch {
    // ignore
  }
}

/**
 * Pick a random unseen question. If everything has been seen, start a fresh
 * cycle (caller is told via `cycled` so it can clear its seen set). `avoidId`
 * prevents the just-shown question from immediately reappearing on reset.
 */
export function pickNext(
  questions: Question[],
  seen: Set<string>,
  avoidId?: string,
): { question: Question; cycled: boolean } | null {
  if (questions.length === 0) return null;

  let pool = questions.filter((q) => !seen.has(q.id));
  let cycled = false;

  if (pool.length === 0) {
    cycled = true;
    pool = questions.filter((q) => q.id !== avoidId);
    if (pool.length === 0) pool = questions; // only one question total
  }

  const question = pool[Math.floor(Math.random() * pool.length)];
  return { question, cycled };
}
