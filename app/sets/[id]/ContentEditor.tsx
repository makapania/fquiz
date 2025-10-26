"use client";
import React from 'react';
import { useEffect, useState } from 'react';
import { useSession, signIn, signOut, getProviders } from 'next-auth/react';

type Card = { id: string; kind: string; prompt: string; answer: string; explanation?: string | null };
type Question = { id: string; stem: string; choices: string[]; correct_index: number; explanation?: string | null };

export default function ContentEditor({ id, type }: { id: string; type: 'flashcards' | 'quiz' }) {
  const { data: session } = useSession();
  const [cards, setCards] = useState<Card[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [rememberKeys, setRememberKeys] = useState(false);
  const [authStatus, setAuthStatus] = useState<'idle'|'healthy'|'degraded'|'error'|'offline'>('idle');
  const [authLatencyMs, setAuthLatencyMs] = useState<number | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authProviders, setAuthProviders] = useState<Record<string, { id: string; name: string }> | null>(null);
  const [devPassword, setDevPassword] = useState('');
  const isDeveloper = (session?.user?.email === 'matt.sponheimer@gmail.com' && devPassword === 'makapansgat');
  const [aiSource, setAiSource] = useState<'prompt' | 'upload'>('prompt');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiProvider, setAiProvider] = useState<'basic' | 'openai' | 'anthropic' | 'zai' | 'openrouter' | 'google'>('basic');
  const [aiModel, setAiModel] = useState('');
  const [aiKey, setAiKey] = useState('');
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [useCustomZaiBaseUrl, setUseCustomZaiBaseUrl] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [stem, setStem] = useState('');
  const [choices, setChoices] = useState<string[]>(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [qExplanation, setQExplanation] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStem, setEditStem] = useState('');
  const [editChoices, setEditChoices] = useState<string[]>(['', '', '', '']);
  const [editCorrectIndex, setEditCorrectIndex] = useState(0);
  const [editExplanation, setEditExplanation] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editCardExplanation, setEditCardExplanation] = useState('');

  async function load() {
    setStatus(null);
    try {
      if (type === 'flashcards') {
        const res = await fetch(`/api/sets/${id}/cards`);
        if (!res.ok) {
          const msg = await res
            .json()
            .then((d) => (typeof d === 'object' && d && 'error' in d ? (d as any).error : JSON.stringify(d)))
            .catch(async () => await res.text());
          throw new Error(msg || `${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        setCards(data.items || []);
      } else {
        const res = await fetch(`/api/sets/${id}/questions`);
        if (!res.ok) {
          const msg = await res
            .json()
            .then((d) => (typeof d === 'object' && d && 'error' in d ? (d as any).error : JSON.stringify(d)))
            .catch(async () => await res.text());
        
          throw new Error(msg || `${res.status} ${res.statusText}`);
        }
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
        setAiBaseUrl('https://api.z.ai/api/paas/v4');
      }
      if (!aiModel) {
        setAiModel('glm-4.6');
      }
    } else if (aiProvider === 'openrouter') {
      if (!aiModel) {
        setAiModel('openai/gpt-4o-mini');
      }
    } else if (aiProvider === 'google') {
      if (!aiModel) {
        setAiModel('gemini-1.5-flash');
      }
    }
    // Load remembered key for this provider if signed-in
    try {
      const email = session?.user?.email || null;
      if (email && rememberKeys) {
        const raw = localStorage.getItem(`fquiz:${email}:keys`);
        if (raw) {
          const keys = JSON.parse(raw || '{}');
          if (keys && typeof keys === 'object' && keys[aiProvider]) {
            setAiKey(keys[aiProvider] || '');
          }
        }
      }
    } catch {}
  }, [aiProvider, useCustomZaiBaseUrl, session, rememberKeys]);

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

  async function checkAuthHealth() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setAuthStatus('offline');
      setAuthLatencyMs(null);
      setAuthMessage('Browser offline');
      return;
    }
    try {
      const start = performance.now();
      const res = await fetch('/api/auth/session', { method: 'GET' });
      const latency = performance.now() - start;
      setAuthLatencyMs(latency);
      if (!res.ok) {
        setAuthStatus('error');
        setAuthMessage(`${res.status} ${res.statusText}`);
      } else {
        setAuthMessage(null);
        setAuthStatus(latency > 400 ? 'degraded' : 'healthy');
      }
    } catch (err: any) {
      setAuthStatus('error');
      setAuthLatencyMs(null);
      setAuthMessage(err?.message || 'fetch failed');
    }
  }

  useEffect(() => {
    checkAuthHealth();
    (async () => {
      try {
        const providers = await getProviders();
        setAuthProviders(providers || null);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        if (aiProvider === 'zai') payload.base_url = aiBaseUrl || 'https://api.z.ai/api/paas/v4';
       } else if (aiModel) {
         payload.model = aiModel;
       }

      const res = await fetch(`/api/sets/${id}/generate/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dev-password': devPassword },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to generate questions');
      }
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
        if (aiProvider === 'zai') payload.base_url = aiBaseUrl || 'https://api.z.ai/api/paas/v4';
       } else if (aiModel) {
         payload.model = aiModel;
       }

      const res = await fetch(`/api/sets/${id}/generate/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dev-password': devPassword },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to generate flashcards');
      }
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
                  <option value="openrouter">OpenRouter</option>
                  <option value="google">Google Gemini</option>
                </select>
              </div>
              <div>
                <label className="block text-sm">Model (optional)</label>
                <input className="rounded-md bg-surface p-2" type="text" value={aiModel} onChange={(e) => setAiModel(e.target.value)} placeholder={aiProvider==='openai' ? 'e.g., gpt-4o-mini' : aiProvider==='anthropic' ? 'e.g., claude-3-haiku-20240307' : aiProvider==='zai' ? 'e.g., glm-4.6' : aiProvider==='openrouter' ? 'e.g., openai/gpt-4o-mini' : aiProvider==='google' ? 'e.g., gemini-1.5-flash' : 'override default model'} />
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
                <input className="w-full rounded-md bg-surface p-2" type="password" value={aiKey} onChange={(e) => {
                  const v = e.target.value;
                  setAiKey(v);
                  try {
                    const email = session?.user?.email || null;
                    if (email && rememberKeys) {
                      const raw = localStorage.getItem(`fquiz:${email}:keys`);
                      const keys = raw ? JSON.parse(raw) : {};
                      keys[aiProvider] = v;
                      localStorage.setItem(`fquiz:${email}:keys`, JSON.stringify(keys));
                    }
                  } catch {}
                }} placeholder={aiProvider==='openai' ? 'OpenAI API key' : aiProvider==='anthropic' ? 'Anthropic API key' : aiProvider==='zai' ? 'Z.ai API key' : aiProvider==='openrouter' ? 'OpenRouter API key' : aiProvider==='google' ? 'Google Generative AI API key' : 'leave blank to use env key'} />
              </div>
              <button className="rounded-md bg-accent px-3 py-2 text-white" onClick={generateFlashcardsAI} disabled={loading || (aiSource==='prompt' && !aiPrompt) || (aiSource==='upload' && !aiFile) || !isDeveloper}>
                {loading ? 'Generating...' : 'Generate 10 flashcards'}
              </button>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${authStatus==='healthy' ? 'bg-green-500' : authStatus==='degraded' ? 'bg-yellow-500' : authStatus==='offline' ? 'bg-gray-400' : authStatus==='error' ? 'bg-red-500' : 'bg-surface2'}`}></span>
                <span className="text-xs text-muted">
                  {authStatus==='healthy' ? `Auth OK${authLatencyMs ? ` (${Math.round(authLatencyMs)} ms)` : ''}` :
                   authStatus==='degraded' ? `Auth slow${authLatencyMs ? ` (${Math.round(authLatencyMs)} ms)` : ''}` :
                   authStatus==='offline' ? 'Offline' :
                   authStatus==='error' ? (authMessage ? `Auth error: ${authMessage}` : 'Auth error') :
                   'Checking auth...'}
                </span>
                <button className="text-xs text-accent" onClick={() => checkAuthHealth()}>Retry</button>
              </div>
              {!session ? (
                <div className="flex items-center gap-2">
                  {(() => {
                    const list = authProviders ? Object.values(authProviders) : [];
                    if (list.length > 0) {
                      return list.map((p) => (
                        <button key={p.id} className="rounded-md bg-surface2 px-3 py-2" onClick={() => signIn(p.id)}>
                          Sign in with {p.name}
                        </button>
                      ));
                    }
                    return (
                      <button className="rounded-md bg-surface2 px-3 py-2" onClick={() => signIn()}>
                        Sign in
                      </button>
                    );
                  })()}
                </div>
              ) : (
                <>
                  <span className="text-muted">Signed in as {session.user?.email}</span>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={rememberKeys} onChange={(e) => setRememberKeys(e.target.checked)} />
                    <span>Remember my AI keys on this device</span>
                  </label>
                  {session?.user?.email === 'matt.sponheimer@gmail.com' && (
                    <div className="inline-flex items-center gap-2">
                      <label className="text-sm">Developer password</label>
                      <input
                        type="password"
                        className="rounded-md bg-surface px-2 py-1 border border-muted"
                        value={devPassword}
                        onChange={(e) => setDevPassword(e.target.value)}
                        placeholder="Enter to enable developer features"
                      />
                      <span className="text-xs text-muted">{isDeveloper ? 'Developer mode enabled' : 'Developer mode locked'}</span>
                    </div>
                  )}
                  <button className="rounded-md bg-surface2 px-3 py-2" onClick={() => signOut()}>Sign out</button>
                </>
              )}
            </div>
            <p className="text-xs text-muted">Generation returns strict JSON and inserts items into this set.</p>
          </div>
          <ul className="space-y-2">
            {cards.map((c) => (
              <li key={c.id} className="rounded-md bg-surface p-3 space-y-2">
                {editingCardId === c.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm">Term</label>
                      <textarea className="w-full rounded-md bg-surface p-2" value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm">Answer</label>
                      <textarea className="w-full rounded-md bg-surface p-2" value={editAnswer} onChange={(e) => setEditAnswer(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm">Explanation (optional)</label>
                      <textarea className="w-full rounded-md bg-surface p-2" value={editCardExplanation} onChange={(e) => setEditCardExplanation(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <button className="rounded-md bg-accent px-3 py-2 text-white" onClick={saveCardEdit} disabled={loading || !editPrompt || !editAnswer}>Save</button>
                      <button className="rounded-md bg-surface2 px-3 py-2" onClick={cancelEditCard} disabled={loading}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="font-medium">{c.prompt}</p>
                    <p className="text-sm">Answer: {c.answer}</p>
                    {c.explanation && <p className="text-sm text-muted">{c.explanation}</p>}
                    <div className="flex gap-2 pt-2">
                      <button className="rounded-md bg-surface2 px-3 py-2" onClick={() => startEditCard(c)} disabled={loading}>Edit</button>
                      <button className="rounded-md bg-red-600 px-3 py-2 text-white" onClick={() => deleteCard(c.id)} disabled={loading}>Delete</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
            {cards.length === 0 && <li className="text-sm text-muted">No flashcards yet.</li>}
          </ul>
        </div>
      ) : type === 'quiz' ? (
            <div className="space-y-3">
          <h3 className="text-lg font-semibold">Add Question Manually</h3>
          <div>
            <label className="block text-sm">Question</label>
            <textarea className="w-full rounded-md bg-surface p-2" value={stem} onChange={(e) => setStem(e.target.value)} placeholder="Enter your question here..." />
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

          <hr className="my-4 border-surface2" />

          <h3 className="text-lg font-semibold">Or Generate with AI</h3>
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
                <option value="openrouter">OpenRouter</option>
                <option value="google">Google Gemini</option>
              </select>
            </div>
            <div>
              <label className="block text-sm">Model (optional)</label>
              <input className="rounded-md bg-surface p-2" type="text" value={aiModel} onChange={(e) => setAiModel(e.target.value)} placeholder={aiProvider==='openai' ? 'e.g., gpt-4o-mini' : aiProvider==='anthropic' ? 'e.g., claude-3-haiku-20240307' : aiProvider==='zai' ? 'glm-4.6' : aiProvider==='openrouter' ? 'e.g., openai/gpt-4o-mini' : aiProvider==='google' ? 'e.g., gemini-1.5-flash' : 'override default'} />
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
                    <input className="rounded-md bg-surface p-2" type="text" value={aiBaseUrl} onChange={(e) => setAiBaseUrl(e.target.value)} placeholder="https://api.z.ai/api/paas/v4" />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm">Base URL</label>
                    <input className="rounded-md bg-surface p-2" type="text" value={aiBaseUrl || 'https://api.z.ai/api/paas/v4'} onChange={(e) => setAiBaseUrl(e.target.value)} />
                  </div>
                )}
              </div>
            )}
            <div className="flex-1">
              <label className="block text-sm">API Key (optional)</label>
              <input className="w-full rounded-md bg-surface p-2" type="password" value={aiKey} onChange={(e) => {
                const v = e.target.value;
                setAiKey(v);
                try {
                  const email = session?.user?.email || null;
                  if (email && rememberKeys) {
                    const raw = localStorage.getItem(`fquiz:${email}:keys`);
                    const keys = raw ? JSON.parse(raw) : {};
                    keys[aiProvider] = v;
                    localStorage.setItem(`fquiz:${email}:keys`, JSON.stringify(keys));
                  }
                } catch {}
              }} placeholder={aiProvider==='openai' ? 'OpenAI API key' : aiProvider==='anthropic' ? 'Anthropic API key' : aiProvider==='zai' ? 'Z.ai API key' : aiProvider==='openrouter' ? 'OpenRouter API key' : aiProvider==='google' ? 'Google Generative AI API key' : 'leave blank to use env key'} />
            </div>
            <button className="rounded-md bg-accent px-3 py-2 text-white" onClick={generateQuestionsAI} disabled={loading || (aiSource==='prompt' && !aiPrompt) || (aiSource==='upload' && !aiFile) || !isDeveloper}>
              {loading ? 'Generating...' : 'Generate 5 questions'}
            </button>
          </div>
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${authStatus==='healthy' ? 'bg-green-500' : authStatus==='degraded' ? 'bg-yellow-500' : authStatus==='offline' ? 'bg-gray-400' : authStatus==='error' ? 'bg-red-500' : 'bg-surface2'}`}></span>
              <span className="text-xs text-muted">
                {authStatus==='healthy' ? `Auth OK${authLatencyMs ? ` (${Math.round(authLatencyMs)} ms)` : ''}` :
                 authStatus==='degraded' ? `Auth slow${authLatencyMs ? ` (${Math.round(authLatencyMs)} ms)` : ''}` :
                 authStatus==='offline' ? 'Offline' :
                 authStatus==='error' ? (authMessage ? `Auth error: ${authMessage}` : 'Auth error') :
                 'Checking auth...'}
              </span>
              <button className="text-xs text-accent" onClick={() => checkAuthHealth()}>Retry</button>
            </div>
            {!session ? (
              <div className="flex items-center gap-2">
                {(() => {
                  const list = authProviders ? Object.values(authProviders) : [];
                  if (list.length > 0) {
                    return list.map((p) => (
                      <button key={p.id} className="rounded-md bg-surface2 px-3 py-2" onClick={() => signIn(p.id)}>
                        Sign in with {p.name}
                      </button>
                    ));
                  }
                  return (
                    <button className="rounded-md bg-surface2 px-3 py-2" onClick={() => signIn()}>
                      Sign in
                    </button>
                  );
                })()}
              </div>
            ) : (
              <>
                <span className="text-muted">Signed in as {session.user?.email}</span>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={rememberKeys} onChange={(e) => setRememberKeys(e.target.checked)} />
                  <span>Remember my AI keys on this device</span>
                </label>
                {session?.user?.email === 'matt.sponheimer@gmail.com' && (
                  <div className="inline-flex items-center gap-2">
                    <label className="text-sm">Developer password</label>
                    <input
                      type="password"
                      className="rounded-md bg-surface px-2 py-1 border border-muted"
                      value={devPassword}
                      onChange={(e) => setDevPassword(e.target.value)}
                      placeholder="Enter to enable developer features"
                    />
                    <span className="text-xs text-muted">{isDeveloper ? 'Developer mode enabled' : 'Developer mode locked'}</span>
                  </div>
                )}
                <button className="rounded-md bg-surface2 px-3 py-2" onClick={() => signOut()}>Sign out</button>
              </>
            )}
          </div>
          <p className="text-xs text-muted">Generation returns strict JSON and inserts items into this set.</p>

          <hr className="my-4 border-surface2" />

          <h3 className="text-lg font-semibold">Questions</h3>
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
      {status && (
        <div className={`rounded-md p-3 ${status.includes('Generated') || status.includes('added') || status.includes('updated') || status.includes('deleted') ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          <p className="text-sm font-medium">{status}</p>
        </div>
      )}
    </div>
  );
}