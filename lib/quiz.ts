import fs from "node:fs";
import path from "node:path";

// ---- Question types -------------------------------------------------------
// The raw shapes match the JSON in public/quiz-bank/<category>/questions.json.
// Note the deliberate quirks the loader/checker must tolerate:
//  - true_false correctAnswer can be a boolean OR the string "True"/"False"
//  - multiple_answer uses `correctAnswers` (string[])
//  - matching uses `correctAnswers` as an object { prompt: choice }

export type QuestionType =
  | "true_false"
  | "multiple_choice"
  | "multiple_answer"
  | "matching";

interface BaseRaw {
  type: QuestionType;
  question: string;
  explanation?: string;
  image?: string;
}

export interface TrueFalseRaw extends BaseRaw {
  type: "true_false";
  choices?: string[];
  correctAnswer: boolean | string;
}

export interface MultipleChoiceRaw extends BaseRaw {
  type: "multiple_choice";
  choices: string[];
  correctAnswer: string;
}

export interface MultipleAnswerRaw extends BaseRaw {
  type: "multiple_answer";
  choices: string[];
  correctAnswers: string[];
}

export interface MatchingRaw extends BaseRaw {
  type: "matching";
  prompts: string[];
  choices: string[];
  correctAnswers: Record<string, string>;
}

export type RawQuestion =
  | TrueFalseRaw
  | MultipleChoiceRaw
  | MultipleAnswerRaw
  | MatchingRaw;

// Loaded question = raw shape + metadata the app attaches.
export type Question = RawQuestion & {
  id: string;
  category: string; // folder name, e.g. "anatomy-and-physiology"
  exam: string; // human label from the file, e.g. "Business"
  imageUrl?: string; // web path under /quiz-bank/... when an image exists
};

interface QuestionFile {
  course?: string;
  exam?: string;
  version?: number;
  questions: RawQuestion[];
}

// ---- Stable id hash (FNV-1a, 32-bit) --------------------------------------
// Derived from question text so ids survive reordering/edits of the JSON,
// keeping localStorage progress stable.
function hash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const QUIZ_BANK_DIR = path.join(process.cwd(), "public", "quiz-bank");

// ---- Build-time loader -----------------------------------------------------
// Scans every category folder under public/quiz-bank. Adding a new category
// (e.g. massage-therapy) needs no code change — just drop in the folder.
export function getAllQuestions(): Question[] {
  const entries = fs.readdirSync(QUIZ_BANK_DIR, { withFileTypes: true });
  const all: Question[] = [];
  const seenIds = new Set<string>();

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const category = entry.name;
    const file = path.join(QUIZ_BANK_DIR, category, "questions.json");
    if (!fs.existsSync(file)) continue;

    const data = JSON.parse(fs.readFileSync(file, "utf8")) as QuestionFile;
    const exam = data.exam ?? category;

    for (const raw of data.questions) {
      // Disambiguate the rare case of identical question text within a
      // category by appending a counter suffix.
      let id = `${category}:${hash(raw.question)}`;
      let n = 1;
      while (seenIds.has(id)) id = `${category}:${hash(raw.question)}-${n++}`;
      seenIds.add(id);

      const q: Question = {
        ...raw,
        id,
        category,
        exam,
        ...(raw.image
          ? { imageUrl: `/quiz-bank/${category}/${raw.image}` }
          : {}),
      };
      all.push(q);
    }
  }

  return all;
}
