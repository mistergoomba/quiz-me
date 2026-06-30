import type { Question } from "./quiz";

// Per-type user selection shapes.
export type Selection =
  | boolean // true_false
  | string // multiple_choice
  | string[] // multiple_answer
  | Record<string, string>; // matching (prompt -> chosen choice)

/** Normalize true_false correctAnswer (boolean OR "True"/"False" string) to a boolean. */
export function trueFalseAnswer(q: Question): boolean {
  if (q.type !== "true_false") return false;
  const a = q.correctAnswer;
  if (typeof a === "boolean") return a;
  return String(a).trim().toLowerCase() === "true";
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((x) => setB.has(x));
}

/** Returns true when the selection is fully correct for the given question. */
export function checkAnswer(q: Question, selection: Selection): boolean {
  switch (q.type) {
    case "true_false":
      return selection === trueFalseAnswer(q);
    case "multiple_choice":
      return selection === q.correctAnswer;
    case "multiple_answer":
      return (
        Array.isArray(selection) && sameSet(selection, q.correctAnswers)
      );
    case "matching": {
      if (typeof selection !== "object" || Array.isArray(selection)) return false;
      const picks = selection as Record<string, string>;
      return q.prompts.every((p) => picks[p] === q.correctAnswers[p]);
    }
    default:
      return false;
  }
}

export const AFFIRMATIONS = [
  "Nailed it! 🎉",
  "Correct! 🙌",
  "You got it!",
  "Spot on. ✨",
  "Exactly right!",
  "Nice work. 💪",
  "Yes! Well done.",
  "Crushing it.",
];

export function randomAffirmation(): string {
  return AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
}
