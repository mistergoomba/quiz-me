import Quiz from "@/components/Quiz";
import { getAllQuestions } from "@/lib/quiz";

export default function Home() {
  const questions = getAllQuestions();
  return <Quiz questions={questions} />;
}
