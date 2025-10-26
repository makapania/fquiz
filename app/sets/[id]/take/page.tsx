"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSoundEffects } from '@/lib/soundEffects';

type Question = {
  id: string;
  stem: string;
  choices: string[];
  correct_index: number;
  explanation?: string | null;
};

type QuizSet = {
  id: string;
  title: string;
  description?: string;
  options: {
    reveal?: 'immediate' | 'deferred';
    choices?: number;
  };
};

type Answer = {
  question_id: string;
  chosen_index: number;
  time_spent_ms: number;
  correct?: boolean;
};

export default function TakeQuizPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { playClick, playCorrect, playWrong } = useSoundEffects();

  const [quizSet, setQuizSet] = useState<QuizSet | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const revealMode = quizSet?.options?.reveal || 'immediate';
  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    loadQuiz();
  }, [id]);

  async function loadQuiz() {
    setLoading(true);
    setError(null);
    try {
      // Load quiz set
      const setRes = await fetch(`/api/sets/${id}`);
      if (!setRes.ok) throw new Error('Quiz not found');
      const setData = await setRes.json();
      setQuizSet(setData);

      // Load questions
      const qRes = await fetch(`/api/sets/${id}/questions`);
      if (!qRes.ok) {
        if (qRes.status === 403) {
          router.push(`/sets/${id}`);
          return;
        }
        throw new Error('Failed to load questions');
      }
      const qData = await qRes.json();

      if (!qData.items || qData.items.length === 0) {
        throw new Error('This quiz has no questions yet');
      }

      setQuestions(qData.items);

      // Start attempt
      const attemptRes = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ set_id: id, is_guest: true }),
      });

      if (!attemptRes.ok) {
        const message = await attemptRes.text();
        throw new Error(message || 'Failed to start quiz');
      }
      const attemptData = await attemptRes.json();
      setAttemptId(attemptData.attempt.id);
      setQuestionStartTime(Date.now());
      
      // Play click sound when first question loads
      setTimeout(() => playClick(), 100);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleChoiceSelect(index: number) {
    if (isAnswered && revealMode === 'immediate') return; // Already answered in immediate mode

    setSelectedChoice(index);

    if (revealMode === 'immediate') {
      // Submit immediately and show feedback
      await submitAnswer(index);
      setIsAnswered(true);
    }
  }

  async function submitAnswer(chosenIndex: number) {
    if (!attemptId || !currentQuestion) return;

    const timeSpent = Date.now() - questionStartTime;

    try {
      const res = await fetch(`/api/attempts/${attemptId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          chosen_index: chosenIndex,
          time_spent_ms: timeSpent,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit answer');
      const data = await res.json();

      // Store answer with correctness
      const answer: Answer = {
        question_id: currentQuestion.id,
        chosen_index: chosenIndex,
        time_spent_ms: timeSpent,
        correct: data.correct,
      };

      setAnswers([...answers, answer]);
      
      // Play sound effect based on correctness (only in immediate mode)
      if (revealMode === 'immediate') {
        setTimeout(() => {
          if (data.correct) {
            playCorrect();
          } else {
            playWrong();
          }
        }, 100);
      }
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleNext() {
    if (revealMode === 'deferred' && selectedChoice !== null && !isAnswered) {
      // Submit the answer before moving to next
      await submitAnswer(selectedChoice);
    }

    if (currentIndex < questions.length - 1) {
      // Move to next question
      setCurrentIndex(currentIndex + 1);
      setSelectedChoice(null);
      setIsAnswered(false);
      setQuestionStartTime(Date.now());
      
      // Play click sound for new question
      setTimeout(() => playClick(), 100);
    } else {
      // Last question - finish quiz
      await finishQuiz();
    }
  }

  async function finishQuiz() {
    if (!attemptId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to submit quiz');
      const data = await res.json();

      setResults(data.summary);
      setShowResults(true);
      
      // Play sound effect based on overall performance
      setTimeout(() => {
        const percentage = data.summary?.percentage || 0;
        if (percentage >= 70) {
          playCorrect(); // Good performance
        } else {
          playWrong(); // Needs improvement
        }
      }, 500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentAnswer = answers.find(a => a.question_id === currentQuestion?.id);
  const showFeedback = revealMode === 'immediate' && isAnswered;

  if (loading) {
    return (
      <main className="space-y-4">
        <p className="text-muted">Loading quiz...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="space-y-4">
        <div className="rounded-lg bg-surface p-4">
          <h2 className="text-xl font-semibold text-red-400">Error</h2>
          <p className="text-muted">{error}</p>
          <button
            onClick={() => router.push(`/sets/${id}`)}
            className="mt-4 rounded-md bg-accent px-4 py-2 text-white"
          >
            Back to Set
          </button>
        </div>
      </main>
    );
  }

  if (showResults) {
    return (
      <main className="space-y-4">
        <div className="rounded-lg bg-surface p-6">
          <h2 className="text-2xl font-semibold">Quiz Complete!</h2>
          <p className="mt-2 text-lg text-muted">{quizSet?.title}</p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-surface2 p-4">
              <p className="text-sm text-muted">Total Questions</p>
              <p className="text-3xl font-bold">{results?.total || 0}</p>
            </div>
            <div className="rounded-lg bg-green-900/30 p-4">
              <p className="text-sm text-muted">Correct</p>
              <p className="text-3xl font-bold text-green-400">{results?.correct || 0}</p>
            </div>
            <div className="rounded-lg bg-red-900/30 p-4">
              <p className="text-sm text-muted">Incorrect</p>
              <p className="text-3xl font-bold text-red-400">{results?.incorrect || 0}</p>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-accent/20 p-6 text-center">
            <p className="text-sm text-muted">Your Score</p>
            <p className="text-5xl font-bold text-accent">{results?.percentage || 0}%</p>
          </div>

          {revealMode === 'deferred' && (
            <div className="mt-8 space-y-6">
              <h3 className="text-xl font-semibold">Review Answers</h3>
              {questions.map((q) => {
                const ans = answers.find(a => a.question_id === q.id);
                const chosen = ans?.chosen_index;
                const correctIdx = q.correct_index;
                return (
                  <div key={q.id} className="rounded-lg bg-surface2 p-4">
                    <p className="font-medium">{q.stem}</p>
                    <div className="mt-4 space-y-2">
                      {q.choices.map((choice, i) => {
                        const isChosen = chosen === i;
                        const isCorrect = correctIdx === i;
                        let bg = 'bg-surface';
                        let border = 'border-surface2';
                        let icon = '';
                        if (isCorrect) {
                          bg = 'bg-green-900/30';
                          border = 'border-green-500';
                          icon = '✓';
                        }
                        if (isChosen && !isCorrect) {
                          bg = 'bg-red-900/30';
                          border = 'border-red-500';
                          icon = '✗';
                        }
                        return (
                          <div key={i} className={`rounded-md border ${border} ${bg} p-3 flex items-center gap-3`}>
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface">
                              {String.fromCharCode(65 + i)}
                            </div>
                            <p className="flex-1">{choice}</p>
                            {icon && <span className={isCorrect ? 'text-green-400' : 'text-red-400'}>{icon}</span>}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <div className="mt-3 rounded-md bg-surface p-3">
                        <p className="text-sm font-medium text-accent">Explanation</p>
                        <p className="text-sm text-muted mt-1">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => router.push(`/sets/${id}`)}
              className="rounded-md bg-surface2 px-4 py-2 text-text"
            >
              Back to Set
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-accent px-4 py-2 text-white"
            >
              Retake Quiz
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!currentQuestion) {
    return (
      <main className="space-y-4">
        <p className="text-muted">No questions available</p>
      </main>
    );
  }

  return (
    <main className="space-y-4">
      {/* Quiz Header */}
      <div className="rounded-lg bg-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{quizSet?.title}</h2>
            <p className="text-sm text-muted">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
          <div className="rounded-full bg-accent px-3 py-1 text-sm font-medium text-white">
            {Math.round(((currentIndex + 1) / questions.length) * 100)}%
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="rounded-lg bg-surface p-6">
        <h3 className="text-lg font-medium">{currentQuestion.stem}</h3>

        <div className="mt-6 space-y-3">
          {currentQuestion.choices.map((choice, index) => {
            const isSelected = selectedChoice === index;
            const isCorrect = currentQuestion.correct_index === index;
            const showAsCorrect = showFeedback && isCorrect;
            const showAsIncorrect = showFeedback && isSelected && !isCorrect;

            let bgClass = 'bg-surface2 hover:bg-surface2/80';
            if (showAsCorrect) {
              bgClass = 'bg-green-900/40 border-2 border-green-500';
            } else if (showAsIncorrect) {
              bgClass = 'bg-red-900/40 border-2 border-red-500';
            } else if (isSelected && !showFeedback) {
              bgClass = 'bg-accent/30 border-2 border-accent';
            }

            return (
              <button
                key={index}
                onClick={() => handleChoiceSelect(index)}
                disabled={isAnswered && revealMode === 'immediate'}
                className={`w-full rounded-lg p-4 text-left transition-all ${bgClass} ${
                  isAnswered && revealMode === 'immediate' ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface">
                    {String.fromCharCode(65 + index)}
                  </div>
                  <p className="flex-1">{choice}</p>
                  {showAsCorrect && <span className="text-green-400">✓</span>}
                  {showAsIncorrect && <span className="text-red-400">✗</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation (immediate mode) */}
        {showFeedback && currentQuestion.explanation && (
          <div className="mt-6 rounded-lg bg-surface2 p-4">
            <p className="text-sm font-medium text-accent">Explanation</p>
            <p className="mt-1 text-sm text-muted">{currentQuestion.explanation}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => router.push(`/sets/${id}`)}
          className="rounded-md bg-surface2 px-4 py-2 text-text"
        >
          Exit Quiz
        </button>

        <button
          onClick={handleNext}
          disabled={selectedChoice === null || isSubmitting}
          className={`rounded-md px-6 py-2 font-medium text-white ${
            selectedChoice === null || isSubmitting
              ? 'cursor-not-allowed bg-surface2 text-muted'
              : 'bg-accent hover:bg-accent/90'
          }`}
        >
          {isSubmitting
            ? 'Submitting...'
            : currentIndex < questions.length - 1
            ? 'Next Question'
            : 'Finish Quiz'}
        </button>
      </div>
    </main>
  );
}
