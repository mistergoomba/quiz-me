import type { Question } from "./quiz";

// localStorage "shuffle bag": every question is shown once before any repeat.
// When the unseen pool empties, the cycle resets automatically.

const SEEN_KEY = "quizme:seen";

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
