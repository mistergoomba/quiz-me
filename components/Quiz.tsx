/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Question } from "@/lib/quiz";
import {
  loadSeen,
  saveSeen,
  resetSeen,
  pickNext,
  loadScore,
  saveScore,
  resetScore,
  type Score,
} from "@/lib/tracking";
import { buildSearchUrl } from "@/lib/search";
import {
  checkAnswer,
  trueFalseAnswer,
  randomAffirmation,
  type Selection,
} from "@/lib/answers";

export default function Quiz({ questions }: { questions: Question[] }) {
  const total = questions.length;

  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState<Question | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [affirmation, setAffirmation] = useState("");
  const [score, setScore] = useState<Score>({ correct: 0, answered: 0 });
  const [ready, setReady] = useState(false);

  // Advance to a new question, marking it seen as it's shown.
  const advance = useCallback(
    (prevSeen: Set<string>, avoidId?: string) => {
      const result = pickNext(questions, prevSeen, avoidId);
      if (!result) return;

      let nextSeen = prevSeen;
      if (result.cycled) {
        resetSeen();
        nextSeen = new Set();
      }
      nextSeen = new Set(nextSeen);
      nextSeen.add(result.question.id);
      saveSeen(nextSeen);

      setSeen(nextSeen);
      setCurrent(result.question);
      setSelection(null);
      setSubmitted(false);
      setWasCorrect(false);
      setAffirmation("");
    },
    [questions],
  );

  // Initialize on mount (localStorage is client-only).
  useEffect(() => {
    const initial = loadSeen();
    setScore(loadScore());
    setReady(true);
    advance(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = useCallback(
    (sel: Selection) => {
      if (!current || submitted) return;
      const correct = checkAnswer(current, sel);
      setSelection(sel);
      setWasCorrect(correct);
      if (correct) setAffirmation(randomAffirmation());
      setSubmitted(true);
      setScore((prev) => {
        const next = {
          correct: prev.correct + (correct ? 1 : 0),
          answered: prev.answered + 1,
        };
        saveScore(next);
        return next;
      });
    },
    [current, submitted],
  );

  const handleNext = useCallback(() => {
    if (!current) return;
    advance(seen, current.id);
  }, [advance, seen, current]);

  // Wipe all progress: score + which questions have been asked.
  const handleReset = useCallback(() => {
    resetScore();
    resetSeen();
    setScore({ correct: 0, answered: 0 });
    setSeen(new Set());
    advance(new Set());
  }, [advance]);

  if (!ready || !current) {
    return <main className="card">Loading…</main>;
  }

  const explanation =
    current.explanation && current.explanation.trim().length > 0
      ? current.explanation.trim()
      : null;

  return (
    <div className="shell">
    <main className="card">
      <header className="meta">
        <span className="badge">{current.exam}</span>
      </header>

      <h1 className="question">{current.question}</h1>

      {current.imageUrl && (
        <img className="qimage" src={current.imageUrl} alt="question figure" />
      )}

      <Inputs
        question={current}
        selection={selection}
        submitted={submitted}
        onSelect={setSelection}
        onSubmit={submit}
      />

      {submitted && (
        <div className={`feedback ${wasCorrect ? "ok" : "bad"}`}>
          {wasCorrect ? (
            <p className="affirm">{affirmation}</p>
          ) : (
            <>
              <p className="nope">Not quite.</p>
              <CorrectAnswer question={current} />
            </>
          )}
          {explanation && <p className="explanation">{explanation}</p>}
          <a
            className="explain-link"
            href={buildSearchUrl(current)}
            target="_blank"
            rel="noopener noreferrer"
          >
            🔍 Explain this to me
          </a>
        </div>
      )}

      {submitted && (
        <button className="next" onClick={handleNext} autoFocus>
          Next →
        </button>
      )}
    </main>

      <div className="scoreboard">
        <p
          className={`score${
            score.answered > 0 && score.correct / score.answered < 0.6
              ? " low"
              : ""
          }`}
        >
          {score.correct} out of {score.answered} correct
        </p>
        <button className="reset" onClick={handleReset}>
          Reset progress
        </button>
        <p className="asked">
          {seen.size} / {total} questions asked
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Inputs({
  question,
  selection,
  submitted,
  onSelect,
  onSubmit,
}: {
  question: Question;
  selection: Selection | null;
  submitted: boolean;
  onSelect: (s: Selection) => void;
  onSubmit: (s: Selection) => void;
}) {
  switch (question.type) {
    case "true_false": {
      const answer = trueFalseAnswer(question);
      return (
        <div className="choices">
          {[true, false].map((val) => {
            const label = val ? "True" : "False";
            let cls = "choice";
            if (submitted) {
              if (val === answer) cls += " correct";
              else if (selection === val) cls += " wrong";
            } else if (selection === val) {
              cls += " selected";
            }
            return (
              <button
                key={label}
                className={cls}
                disabled={submitted}
                onClick={() => onSubmit(val)}
              >
                {label}
              </button>
            );
          })}
        </div>
      );
    }

    case "multiple_choice": {
      const chosen = typeof selection === "string" ? selection : null;
      return (
        <>
          <div className="choices">
            {question.choices.map((choice) => {
              let cls = "choice";
              if (submitted) {
                if (choice === question.correctAnswer) cls += " correct";
                else if (choice === chosen) cls += " wrong";
              } else if (choice === chosen) {
                cls += " selected";
              }
              return (
                <button
                  key={choice}
                  className={cls}
                  disabled={submitted}
                  onClick={() => onSelect(choice)}
                >
                  {choice}
                </button>
              );
            })}
          </div>
          {!submitted && (
            <SubmitButton
              disabled={chosen === null}
              onClick={() => chosen !== null && onSubmit(chosen)}
            />
          )}
        </>
      );
    }

    case "multiple_answer": {
      const chosen: string[] = Array.isArray(selection) ? selection : [];
      const toggle = (choice: string) => {
        const next = chosen.includes(choice)
          ? chosen.filter((c) => c !== choice)
          : [...chosen, choice];
        onSelect(next);
      };
      return (
        <>
          <p className="hint">Select all that apply.</p>
          <div className="choices">
            {question.choices.map((choice) => {
              const isChosen = chosen.includes(choice);
              const isCorrect = question.correctAnswers.includes(choice);
              let cls = "choice checkbox";
              if (submitted) {
                if (isCorrect) cls += " correct";
                else if (isChosen) cls += " wrong";
              } else if (isChosen) {
                cls += " selected";
              }
              return (
                <button
                  key={choice}
                  className={cls}
                  disabled={submitted}
                  onClick={() => toggle(choice)}
                >
                  <span className="box">{isChosen ? "☑" : "☐"}</span>
                  {choice}
                </button>
              );
            })}
          </div>
          {!submitted && (
            <SubmitButton
              disabled={chosen.length === 0}
              onClick={() => onSubmit(chosen)}
            />
          )}
        </>
      );
    }

    case "matching": {
      const picks: Record<string, string> =
        selection && typeof selection === "object" && !Array.isArray(selection)
          ? (selection as Record<string, string>)
          : {};
      const setPick = (prompt: string, choice: string) => {
        onSelect({ ...picks, [prompt]: choice });
      };
      const allPicked = question.prompts.every((p) => picks[p]);
      return (
        <>
          <div className="matching">
            {question.prompts.map((prompt) => {
              const picked = picks[prompt] ?? "";
              const correct = question.correctAnswers[prompt];
              let rowCls = "match-row";
              if (submitted) {
                rowCls += picked === correct ? " correct" : " wrong";
              }
              return (
                <div key={prompt} className={rowCls}>
                  <span className="prompt">{prompt}</span>
                  <select
                    className="match-select"
                    value={picked}
                    disabled={submitted}
                    onChange={(e) => setPick(prompt, e.target.value)}
                  >
                    <option value="" disabled>
                      Choose…
                    </option>
                    {question.choices.map((choice) => (
                      <option key={choice} value={choice}>
                        {choice}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
          {!submitted && (
            <SubmitButton
              disabled={!allPicked}
              onClick={() => onSubmit(picks)}
            />
          )}
        </>
      );
    }

    default:
      return null;
  }
}

function SubmitButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button className="submit" disabled={disabled} onClick={onClick}>
      Submit
    </button>
  );
}

function CorrectAnswer({ question }: { question: Question }) {
  switch (question.type) {
    case "true_false":
      return (
        <p className="answer">
          Correct answer: <strong>{trueFalseAnswer(question) ? "True" : "False"}</strong>
        </p>
      );
    case "multiple_choice":
      return (
        <p className="answer">
          Correct answer: <strong>{question.correctAnswer}</strong>
        </p>
      );
    case "multiple_answer":
      return (
        <div className="answer">
          Correct answers:
          <ul>
            {question.correctAnswers.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      );
    case "matching":
      return (
        <div className="answer">
          Correct matches:
          <ul>
            {question.prompts.map((p) => (
              <li key={p}>
                <strong>{p}</strong> → {question.correctAnswers[p]}
              </li>
            ))}
          </ul>
        </div>
      );
    default:
      return null;
  }
}
