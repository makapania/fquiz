"use client";
import React from 'react';
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

  // Edit question state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStem, setEditStem] = useState('');
  const [editChoices, setEditChoices] = useState<string[]>(['', '', '', '']);
  const [editCorrectIndex, setEditCorrectIndex] = useState(0);
  const [editExplanation, setEditExplanation] = useState('');

  // Flashcard edit state
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editCardExplanation, setEditCardExplanation] = useState('');

  // AI generation state (quiz only)
  const [aiSource, setAiSource] = useState<'prompt' | 'upload'>('prompt');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiProvider, setAiProvider] = useState<'basic' | 'openai' | 'anthropic' | 'zai'>('basic');
  const [aiModel, setAiModel] = useState('');
  const [aiKey, setAiKey] = useState('');
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [useCustomZaiBaseUrl, setUseCustomZaiBaseUrl] = useState(false);

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

  // Auto-populate sensible defaults for Z.ai
  useEffect(() => {
    if (aiProvider === 'zai') {
      if (!useCustomZaiBaseUrl) {
        setAiBaseUrl('https://api.z.ai/v1');
      }
      if (!aiModel) {
        setAiModel('zai-chat');
      }
    }
  }, [aiProvider, useCustomZaiBaseUrl]);

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
    return String.fromCharCode(65 + i);
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

  function startEdit(q: Question) {
    setEditingId(q.id);
    setEditStem(q.stem);
    setEditChoices([...q.choices, ...Array(Math.max(0, 4 - q.choices.length)).fill('')].slice(0, 4));
    setEditCorrectIndex(q.correct_index);
    setEditExplanation(q.explanation || '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditStem('');
    setEditChoices(['', '', '', '']);
    setEditCorrectIndex(0);
    setEditExplanation('');
  }

  // Flashcard edit helpers
  function startEditCard(c: Card) {
    setEditingCardId(c.id);
    setEditPrompt(c.prompt);
    setEditAnswer(c.answer);
    setEditCardExplanation(c.explanation || '');
  }

  function cancelEditCard() {
    setEditingCardId(null);
    setEditPrompt('');
    setEditAnswer('');
    setEditCardExplanation('');
  }

  async function saveEdit() {
    if (!editingId) return;
    setLoading(true);
    setStatus(null);
    try {
      const payload = {
        stem: editStem,
        choices: editChoices,
        correct_index: editCorrectIndex,
        explanation: editExplanation || null,
      };
      const res = await fetch(`/api/questions/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      cancelEdit();
      await load();
      setStatus('Question updated');
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveCardEdit() {
    if (!editingCardId) return;
    setLoading(true);
    setStatus(null);
    try {
      const payload = {
        prompt: editPrompt,
        answer: editAnswer,
        explanation: editCardExplanation || null,
      };
      const res = await fetch(`/api/cards/${editingCardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      cancelEditCard();
      await load();
      setStatus('Flashcard updated');
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateQuestionsAI() {
    setLoading(true);
    setStatus(null);
    try {
      let upload_id: string | undefined;
      if (aiSource === 'upload') {
        if (!aiFile) throw new Error('Please choose a text/markdown file');
        const fd = new FormData();
        fd.append('file', aiFile);
        const up = await fetch('/api/uploads', { method: 'POST', body: fd });
        if (!up.ok) throw new Error(await up.text());
        const upData = await up.json();
        upload_id = upData.id;
      }
      const payload: any = {
        source: aiSource,
        provider: aiProvider,
        count: 5,
      };
      if (aiSource === 'prompt') payload.prompt = aiPrompt;
      if (upload_id) payload.upload_id = upload_id;
      if (aiProvider !== 'basic') {
        if (aiKey) payload.api_key = aiKey;
        if (aiModel) payload.model = aiModel;
        if (aiProvider === 'zai') payload.base_url = aiBaseUrl || 'https://api.z.ai/v1';
       } else if (aiModel) {
         payload.model = aiModel;
       }

      const res = await fetch(`/api/sets/${id}/generate/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      await load();
      setStatus(`Generated ${data.inserted} questions`);
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateFlashcardsAI() {
    setLoading(true);
    setStatus(null);
    try {
      let upload_id: string | undefined;
      if (aiSource === 'upload') {
        if (!aiFile) throw new Error('Please choose a text/markdown file');
        const fd = new FormData();
        fd.append('file', aiFile);
        const up = await fetch('/api/uploads', { method: 'POST', body: fd });
        if (!up.ok) throw new Error(await up.text());
        const upData = await up.json();
        upload_id = upData.id;
      }
      const payload: any = {
        source: aiSource,
        provider: aiProvider,
        count: 10,
      };
      if (aiSource === 'prompt') payload.prompt = aiPrompt;
      if (upload_id) payload.upload_id = upload_id;
      if (aiProvider !== 'basic') {
        if (aiKey) payload.api_key = aiKey;
        if (aiModel) payload.model = aiModel;
        if (aiProvider === 'zai') payload.base_url = aiBaseUrl || 'https://api.z.ai/v1';
       } else if (aiModel) {
         payload.model = aiModel;
       }

      const res = await fetch(`/api/sets/${id}/generate/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      await load();
      setStatus(`Generated ${data.inserted} flashcards`);
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteQuestion(id: string) {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      await load();
      setStatus('Question deleted');
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteCard(id: string) {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/cards/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      await load();
      setStatus('Flashcard deleted');
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-md bg-surface2 p-4 space-y-4">
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
          <div className="rounded-md bg-surface2 p-3 space-y-2">
            <p className="font-medium">AI Generate Flashcards</p>
            <div className="flex flex-wrap gap-2 items-center">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" checked={aiSource==='prompt'} onChange={() => setAiSource('prompt')} />
                <span>From prompt</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" checked={aiSource==='upload'} onChange={() => setAiSource('upload')} />
                <span>From upload (.txt/.md)</span>
              </label>
            </div>
            {aiSource === 'prompt' ? (
              <div>
                <label className="block text-sm">Topic prompt</label>
                <textarea className="w-full rounded-md bg-surface p-2" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="e.g., Key terms and definitions for cellular respiration" />
              </div>
            ) : (
              <div>
                <label className="block text-sm">Upload file (.txt/.md)</label>
                <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={(e) => setAiFile(e.target.files?.[0] || null)} />
              </div>
            )}
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-sm">Provider</label>
                <select className="rounded-md bg-surface p-2" value={aiProvider} onChange={(e) => setAiProvider(e.target.value as any)}>
                  <option value="basic">Basic (uses default key)</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Claude</option>
                  <option value="zai">Z.ai</option>
                </select>
              </div>
              <div>
                <label className="block text-sm">Model (optional)</label>
                <input className="rounded-md bg-surface p-2" type="text" value={aiModel} onChange={(e) => setAiModel(e.target.value)} placeholder={aiProvider==='openai' ? 'e.g., gpt-4o-mini' : aiProvider==='anthropic' ? 'e.g., claude-3-haiku-20240307' : aiProvider==='zai' ? 'zai-chat' : 'override default'} />
              </div>
              {aiProvider==='zai' && (
                <div className="flex items-end gap-2">
                  <div>
                    <label className="block text-sm">Use custom base URL</label>
                    <input type="checkbox" checked={useCustomZaiBaseUrl} onChange={(e) => setUseCustomZaiBaseUrl(e.target.checked)} />
                  </div>
                  {useCustomZaiBaseUrl ? (
                    <div>
                      <label className="block text-sm">Base URL</label>
                      <input className="rounded-md bg-surface p-2" type="text" value={aiBaseUrl} onChange={(e) => setAiBaseUrl(e.target.value)} placeholder="https://api.z.ai/v1" />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm">Base URL</label>
                      <input className="rounded-md bg-surface p-2" type="text" value={aiBaseUrl || 'https://api.z.ai/v1'} onChange={(e) => setAiBaseUrl(e.target.value)} />
                    </div>
                  )}
                </div>
              )}
              <div className="flex-1">
                <label className="block text-sm">API Key (optional)</label>
                <input className="w-full rounded-md bg-surface p-2" type="password" value={aiKey} onChange={(e) => setAiKey(e.target.value)} placeholder={aiProvider==='openai' ? 'OpenAI API key' : aiProvider==='anthropic' ? 'Anthropic API key' : aiProvider==='zai' ? 'Z.ai API key' : 'leave blank to use default'} />
              </div>
              <button className="rounded-md bg-accent px-3 py-2 text-white" onClick={generateFlashcardsAI} disabled={loading || (aiSource==='prompt' && !aiPrompt) || (aiSource==='upload' && !aiFile)}>Generate 10 flashcards</button>
            </div>
            <p className="text-xs text-muted">Generation returns strict JSON and inserts items into this set.</p>
          </div>
        </div>
      ) : type === 'quiz' ? (
            <div className="space-y-3">
             <div className="flex flex-wrap gap-2 items-center">
               <label className="inline-flex items-center gap-2 text-sm">
                 <input type="radio" checked={aiSource==='prompt'} onChange={() => setAiSource('prompt')} />
                 <span>From prompt</span>
               </label>
               <label className="inline-flex items-center gap-2 text-sm">
                 <input type="radio" checked={aiSource==='upload'} onChange={() => setAiSource('upload')} />
                 <span>From upload (.txt/.md)</span>
               </label>
             </div>
             {aiSource === 'prompt' ? (
               <div>
                 <label className="block text-sm">Topic prompt</label>
                 <textarea className="w-full rounded-md bg-surface p-2" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="e.g., Questions about catarrhine primates or Australopithecus africanus" />
               </div>
             ) : (
               <div>
                 <label className="block text-sm">Upload file (.txt/.md)</label>
                 <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={(e) => setAiFile(e.target.files?.[0] || null)} />
               </div>
             )}
             <div className="flex flex-wrap items-end gap-3">
               <div>
                 <label className="block text-sm">Provider</label>
                 <select className="rounded-md bg-surface p-2" value={aiProvider} onChange={(e) => setAiProvider(e.target.value as any)}>
                   <option value="basic">Basic (uses default key)</option>
                   <option value="openai">OpenAI</option>
                   <option value="anthropic">Claude</option>
                   <option value="zai">Z.ai</option>
                 </select>
               </div>
               <div>
                 <label className="block text-sm">Model (optional)</label>
                 <input className="rounded-md bg-surface p-2" type="text" value={aiModel} onChange={(e) => setAiModel(e.target.value)} placeholder={aiProvider==='openai' ? 'e.g., gpt-4o-mini' : aiProvider==='anthropic' ? 'e.g., claude-3-haiku-20240307' : aiProvider==='zai' ? 'zai-chat' : 'override default'} />
               </div>
              {aiProvider==='zai' && (
                <div className="flex items-end gap-2">
                  <div>
                    <label className="block text-sm">Use custom base URL</label>
                    <input type="checkbox" checked={useCustomZaiBaseUrl} onChange={(e) => setUseCustomZaiBaseUrl(e.target.checked)} />
                  </div>
                  {useCustomZaiBaseUrl ? (
                    <div>
                      <label className="block text-sm">Base URL</label>
                      <input className="rounded-md bg-surface p-2" type="text" value={aiBaseUrl} onChange={(e) => setAiBaseUrl(e.target.value)} placeholder="https://api.z.ai/v1" />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm">Base URL</label>
                      <input className="rounded-md bg-surface p-2" type="text" value={aiBaseUrl || 'https://api.z.ai/v1'} onChange={(e) => setAiBaseUrl(e.target.value)} />
                    </div>
                  )}
                </div>
              )}
               <div className="flex-1">
                 <label className="block text-sm">API Key (optional)</label>
                 <input className="w-full rounded-md bg-surface p-2" type="password" value={aiKey} onChange={(e) => setAiKey(e.target.value)} placeholder={aiProvider==='openai' ? 'OpenAI API key' : aiProvider==='anthropic' ? 'Anthropic API key' : aiProvider==='zai' ? 'Z.ai API key' : 'leave blank to use default'} />
               </div>
               <button className="rounded-md bg-accent px-3 py-2 text-white" onClick={generateQuestionsAI} disabled={loading || (aiSource==='prompt' && !aiPrompt) || (aiSource==='upload' && !aiFile)}>Generate 5 questions</button>
             </div>
             <p className="text-xs text-muted">Generation returns strict JSON and inserts items into this set.</p>
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
                  <input type="radio" name="correct-letter" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} />
                  <span>{idxToLetter(i)}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm">Explanation (optional)</label>
            <textarea className="w-full rounded-md bg-surface p-2" value={qExplanation} onChange={(e) => setQExplanation(e.target.value)} />
          </div>
          <button className="rounded-md bg-accent px-3 py-2 text-white" onClick={addQuestion} disabled={loading || !stem || choices.filter(Boolean).length < 2}>Add question</button>

          <ul className="space-y-2">
            {questions.map((q) => (
              <li key={q.id} className="rounded-md bg-surface p-3 space-y-2">
                {editingId === q.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm">Question</label>
                      <textarea className="w-full rounded-md bg-surface p-2" value={editStem} onChange={(e) => setEditStem(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm">Choices (A–D)</label>
                      {editChoices.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 mb-2">
                          <span className="w-6 text-sm font-medium">{idxToLetter(i)}</span>
                          <input
                            className="flex-1 rounded-md bg-surface p-2"
                            type="text"
                            value={c}
                            onChange={(e) => {
                              const next = [...editChoices];
                              next[i] = e.target.value;
                              setEditChoices(next);
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
                            <input type="radio" name={`edit-correct-${q.id}`} checked={editCorrectIndex === i} onChange={() => setEditCorrectIndex(i)} />
                            <span>{idxToLetter(i)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm">Explanation (optional)</label>
                      <textarea className="w-full rounded-md bg-surface p-2" value={editExplanation} onChange={(e) => setEditExplanation(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <button className="rounded-md bg-accent px-3 py-2 text-white" onClick={saveEdit} disabled={loading || !editStem || editChoices.filter(Boolean).length < 2}>Save</button>
                      <button className="rounded-md bg-surface2 px-3 py-2" onClick={cancelEdit} disabled={loading}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="font-medium">{q.stem}</p>
                    <p className="text-sm text-muted">Choices: {q.choices.map((c, i) => `${String.fromCharCode(65 + i)}) ${c}`).join(', ')}</p>
                    <p className="text-sm">Correct: {String.fromCharCode(65 + q.correct_index)}) {q.choices[q.correct_index]}</p>
                    {q.explanation && <p className="text-sm">{q.explanation}</p>}
                    <div className="flex gap-2 pt-2">
                      <button className="rounded-md bg-surface2 px-3 py-2" onClick={() => startEdit(q)} disabled={loading}>Edit</button>
                      <button className="rounded-md bg-red-600 px-3 py-2 text-white" onClick={() => deleteQuestion(q.id)} disabled={loading}>Delete</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
            {questions.length === 0 && <li className="text-sm text-muted">No questions yet.</li>}
          </ul>
        </div>
      ) : null}
      {status && <p className="text-sm">{status}</p>}
    </div>
  );
}