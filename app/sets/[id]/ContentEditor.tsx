"use client";
import { useEffect, useState } from 'react';

type Card = { id: string; kind: string; prompt: string; answer: string; explanation?: string | null };
type Question = { id: string; stem: string; choices: string[]; correct_index: number; explanation?: string | null };

export default function ContentEditor({ id, type }: { id: string; type: 'flashcards' | 'quiz' }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // New flashcard inputs
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');

  // New question inputs
  const [stem, setStem] = useState('');
  const [choices, setChoices] = useState<string[]>(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [qExplanation, setQExplanation] = useState('');

  async function load() {
    setStatus(null);
    try {
      if (type === 'flashcards') {
        const res = await fetch(`/api/sets/${id}/cards`);
        const data = await res.json();
        setCards(data.items || []);
      } else {
        const res = await fetch(`/api/sets/${id}/questions`);
        const data = await res.json();
        setQuestions(data.items || []);
      }
    } catch (e: any) {
      setStatus(e.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, type]);

  async function addCard() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/sets/${id}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, answer, explanation: explanation || null })
      });
      if (!res.ok) throw new Error(await res.text());
      setPrompt('');
      setAnswer('');
      setExplanation('');
      await load();
      setStatus('Flashcard added');
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  }

  function idxToLetter(i: number) {
    return String.fromCharCode(65 + i); // 0 -> A, 1 -> B, 2 -> C, 3 -> D
  }

  async function addQuestion() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/sets/${id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stem, choices, correct_index: correctIndex, explanation: qExplanation || null })
      });
      if (!res.ok) throw new Error(await res.text());
      setStem('');
      setChoices(['', '', '', '']);
      setCorrectIndex(0);
      setQExplanation('');
      await load();
      setStatus('Question added');
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-md bg-surface2 p-4 space-y-4">
      <h3 className="font-semibold">Content</h3>
      {type === 'flashcards' ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm">Prompt</label>
            <textarea className="w-full rounded-md bg-surface p-2" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">Answer</label>
            <textarea className="w-full rounded-md bg-surface p-2" value={answer} onChange={(e) => setAnswer(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">Explanation (optional)</label>
            <textarea className="w-full rounded-md bg-surface p-2" value={explanation} onChange={(e) => setExplanation(e.target.value)} />
          </div>
          <button className="rounded-md bg-accent px-3 py-2 text-white" onClick={addCard} disabled={loading || !prompt || !answer}>Add flashcard</button>
          <ul className="space-y-2">
            {cards.map((c) => (
              <li key={c.id} className="rounded-md bg-surface p-3">
                <p className="font-medium">{c.prompt}</p>
                <p className="text-sm text-muted">Answer: {c.answer}</p>
                {c.explanation && <p className="text-sm">{c.explanation}</p>}
              </li>
            ))}
            {cards.length === 0 && <li className="text-sm text-muted">No flashcards yet.</li>}
          </ul>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm">Question</label>
            <textarea className="w-full rounded-md bg-surface p-2" value={stem} onChange={(e) => setStem(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">Choices (A–D)</label>
            {choices.map((choice, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <span className="w-6 text-sm font-medium">{idxToLetter(i)}</span>
                <input
                  className="flex-1 rounded-md bg-surface p-2"
                  type="text"
                  value={choice}
                  onChange={(e) => {
                    const next = [...choices];
                    next[i] = e.target.value;
                    setChoices(next);
                  }}
                  placeholder={`Choice ${idxToLetter(i)}`}
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm">Correct answer (A–D)</label>
            <div className="flex gap-4">
              {[0, 1, 2, 3].map((i) => (
                <label key={i} className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="correct-letter"
                    checked={correctIndex === i}
                    onChange={() => setCorrectIndex(i)}
                  />
                  <span>{idxToLetter(i)}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted mt-1">Pick A, B, C, or D instead of a number.</p>
          </div>
          <div>
            <label className="block text-sm">Explanation (optional)</label>
            <textarea className="w-full rounded-md bg-surface p-2" value={qExplanation} onChange={(e) => setQExplanation(e.target.value)} />
          </div>
          <button className="rounded-md bg-accent px-3 py-2 text-white" onClick={addQuestion} disabled={loading || !stem || choices.filter(Boolean).length < 2}>Add question</button>
          <ul className="space-y-2">
            {questions.map((q) => (
              <li key={q.id} className="rounded-md bg-surface p-3">
                <p className="font-medium">{q.stem}</p>
                <p className="text-sm text-muted">Choices: {q.choices.map((c, i) => `${String.fromCharCode(65 + i)}) ${c}`).join(', ')}</p>
                <p className="text-sm">Correct: {String.fromCharCode(65 + q.correct_index)}) {q.choices[q.correct_index]}</p>
                {q.explanation && <p className="text-sm">{q.explanation}</p>}
              </li>
            ))}
            {questions.length === 0 && <li className="text-sm text-muted">No questions yet.</li>}
          </ul>
        </div>
      )}
      {status && <p className="text-sm">{status}</p>}
    </section>
  );
}