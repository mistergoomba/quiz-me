import type { Question } from "./quiz";
import { trueFalseAnswer } from "./answers";

// Builds a Google search that asks for an explanation of the question.
// No content is generated/stored — the link is derived from the question data,
// so it stays correct for all questions with zero maintenance and no risk of a
// wrong explanation. Any question may override the generated query by setting a
// `searchQuery` field in its JSON.

const SEARCH_PREFIX = "explain this to me: ";

// Per-deck context appended to disambiguate short terms (e.g. "pronation").
const DECK_CONTEXT: Record<string, string> = {
  "anatomy-and-physiology": "massage therapy anatomy",
  business: "massage therapy business ethics",
  "massage-therapy": "massage therapy",
};

/** The plain-text query (what actually gets searched). */
export function buildSearchQuery(q: Question): string {
  if (q.searchQuery && q.searchQuery.trim()) return q.searchQuery.trim();

  const ctx = DECK_CONTEXT[q.category] ?? "massage therapy";

  // True/false reads best as "explain why this is <answer>: <statement>".
  if (q.type === "true_false") {
    const tf = trueFalseAnswer(q) ? "true" : "false";
    return `explain why this is ${tf}: ${q.question} (${ctx})`;
  }

  let core: string;
  switch (q.type) {
    case "multiple_answer":
      core = `${q.question} Answer: ${q.correctAnswers.join(", ")}`;
      break;
    case "matching":
      // For matching, the useful lookup is the set of terms + their definitions.
      core = `${q.choices.join(", ")} — definitions`;
      break;
    case "multiple_choice":
      core = `${q.question} Answer: ${q.correctAnswer}`;
      break;
  }

  return `${SEARCH_PREFIX}${core} (${ctx})`;
}

/** The full Google search URL. */
export function buildSearchUrl(q: Question): string {
  return (
    "https://www.google.com/search?q=" +
    encodeURIComponent(buildSearchQuery(q))
  );
}
