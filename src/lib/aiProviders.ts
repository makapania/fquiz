type MCQ = { stem: string; choices: string[]; correct_index: number; explanation?: string | null };

function buildInstructions(inputText: string, count: number) {
  return `You are an assistant that generates multiple-choice questions (MCQs).
Return ONLY a JSON array, no prose, with ${count} items. Each item MUST be:
{
  "stem": "question",
  "choices": ["A","B","C","D"],
  "correct_index": 0,
  "explanation": "optional"
}
Constraints:
- choices length MUST be 4.
- correct_index MUST be 0..3 and match the correct choice.
- stems and choices should be concise and academically sound.
- Base questions strictly on this input (summarize if needed):
"""
${inputText}
"""`;
}

function stripCodeFences(text: string) {
  return text.replace(/```json[\s\S]*?```/g, (m) => m.replace(/```json\n?|```/g, ''))
             .replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, ''));
}

export function parseMCQJson(raw: string): MCQ[] {
  const text = stripCodeFences(raw).trim();
  // Heuristically find the outermost [ ... ]
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) throw new Error('Model did not return JSON array');
  const jsonStr = text.slice(start, end + 1);
  const arr = JSON.parse(jsonStr);
  if (!Array.isArray(arr)) throw new Error('Parsed JSON is not an array');
  // Basic validation
  const normalized: MCQ[] = arr.map((q: any) => ({
    stem: String(q.stem || q.question || '').trim(),
    choices: Array.isArray(q.choices) ? q.choices.map((c: any) => String(c)) : [],
    correct_index: Number(q.correct_index ?? q.answer_index ?? 0),
    explanation: q.explanation != null ? String(q.explanation) : null,
  }));
  normalized.forEach((q, i) => {
    if (!q.stem) throw new Error(`Item ${i} missing stem`);
    if (!Array.isArray(q.choices) || q.choices.length !== 4) throw new Error(`Item ${i} choices must have 4 items`);
    if (!Number.isInteger(q.correct_index) || q.correct_index < 0 || q.correct_index > 3) throw new Error(`Item ${i} invalid correct_index`);
  });
  return normalized;
}

export async function generateWithOpenAI(params: { apiKey: string; model?: string; inputText: string; count: number }) {
  const { apiKey, model = 'gpt-4o-mini', inputText, count } = params;
  const instructions = buildInstructions(inputText, count);
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that outputs strictly JSON when asked.' },
        { role: 'user', content: instructions },
      ]
    })
  });
  if (!resp.ok) throw new Error(await resp.text());
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  return parseMCQJson(text);
}

export async function generateWithAnthropic(params: { apiKey: string; model?: string; inputText: string; count: number }) {
  const { apiKey, model = 'claude-3-haiku-20240307', inputText, count } = params;
  const instructions = buildInstructions(inputText, count);
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      messages: [
        { role: 'user', content: [{ type: 'text', text: instructions }] }
      ]
    })
  });
  if (!resp.ok) throw new Error(await resp.text());
  const data = await resp.json();
  const text = data.content?.[0]?.text ?? '';
  return parseMCQJson(text);
}

export async function generateWithGoogle(params: { apiKey: string; model?: string; inputText: string; count: number; baseUrl?: string }) {
  const { apiKey, model = 'gemini-2.5-flash', inputText, count, baseUrl } = params;
  const ALLOWED_GOOGLE_MODELS = new Set([
    'gemini-2.5-flash',
    'gemini-2.5-flash-preview',
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash'
  ]);
  if (model && !ALLOWED_GOOGLE_MODELS.has(model)) {
    console.warn('[AI][google] Invalid model specified:', model);
    throw new Error(`Invalid Google Gemini model: ${model}. Allowed: ${Array.from(ALLOWED_GOOGLE_MODELS).join(', ')}`);
  }
  const base = baseUrl || process.env.GOOGLE_GENAI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
  const instructions = buildInstructions(inputText, count);
  const url = `${base}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `You are a helpful assistant that outputs strictly JSON when asked.\n\n${instructions}` }]
        }
      ]
    })
  });
  if (!resp.ok) throw new Error(await resp.text());
  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || p).join('\n') || '';
  return parseMCQJson(text);
}


export async function generateWithZAI(params: { apiKey: string; model?: string; inputText: string; count: number; baseUrl?: string }) {
  const { apiKey, model = 'glm-4.6', inputText, count, baseUrl } = params;
  const base = baseUrl || process.env.ZAI_BASE_URL || 'https://api.z.ai/api/paas/v4';
  const instructions = buildInstructions(inputText, count);
  const resp = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that outputs strictly JSON when asked.' },
        { role: 'user', content: instructions },
      ]
    })
  });
  if (!resp.ok) throw new Error(await resp.text());
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  return parseMCQJson(text);
}

export async function generateBasic(params: { inputText: string; count: number }) {
  // Basic provider falls back to OpenAI with env key, labeled as "basic quality".
  const apiKey = process.env.OPENAI_API_KEY || '';
  if (!apiKey) throw new Error('Basic provider not configured. Set OPENAI_API_KEY or use BYO key.');
  return generateWithOpenAI({ apiKey, model: 'gpt-4o-mini', inputText: params.inputText, count: params.count });
}

// Flashcards type
type Flashcard = { term: string; answer: string; explanation?: string | null };

function buildFlashcardInstructions(inputText: string, count: number) {
  return `You are an assistant that generates concise academic flashcards.
Return ONLY a JSON array, no prose, with ${count} items. Each item MUST be:
{
  "term": "short term or concept",
  "answer": "concise definition or explanation",
  "explanation": "optional longer explanation"
}
Constraints:
- Keep terms brief and academically correct.
- Answers should be 1–2 sentences, factual.
- Base flashcards strictly on this input (summarize if needed):
"""
${inputText}
"""`;
}

function parseFlashcardJson(raw: string): Flashcard[] {
  const stripCodeFences = (text: string) => text
    .replace(/```json[\s\S]*?```/g, (m) => m.replace(/```json\n?|```/g, ''))
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, ''));
  const text = stripCodeFences(raw).trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) throw new Error('Model did not return JSON array');
  const jsonStr = text.slice(start, end + 1);
  const arr = JSON.parse(jsonStr);
  if (!Array.isArray(arr)) throw new Error('Parsed JSON is not an array');
  const normalized: Flashcard[] = arr.map((c: any) => ({
    term: String(c.term || c.prompt || '').trim(),
    answer: String(c.answer || c.definition || '').trim(),
    explanation: c.explanation != null ? String(c.explanation) : null,
  }));
  normalized.forEach((c, i) => {
    if (!c.term) throw new Error(`Item ${i} missing term`);
    if (!c.answer) throw new Error(`Item ${i} missing answer`);
  });
  return normalized;
}

export async function generateWithOpenRouter(params: { apiKey: string; model?: string; inputText: string; count: number; siteUrl?: string; siteTitle?: string; baseUrl?: string }) {
  const { apiKey, model = 'openai/gpt-4o', inputText, count, siteUrl, siteTitle, baseUrl } = params;
  const base = baseUrl || process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  const instructions = buildInstructions(inputText, count);
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  const referer = siteUrl || process.env.OPENROUTER_SITE_URL;
  const title = siteTitle || process.env.OPENROUTER_SITE_TITLE;
  if (referer) headers['HTTP-Referer'] = referer;
  if (title) headers['X-Title'] = title;

  const resp = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that outputs strictly JSON when asked.' },
        { role: 'user', content: instructions },
      ]
    })
  });
  if (!resp.ok) throw new Error(await resp.text());
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  return parseMCQJson(text);
}

export async function generateFlashcardsWithOpenRouter(params: { apiKey: string; model?: string; inputText: string; count: number; siteUrl?: string; siteTitle?: string; baseUrl?: string }) {
  const { apiKey, model = 'openai/gpt-4o', inputText, count, siteUrl, siteTitle, baseUrl } = params;
  const base = baseUrl || process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  const instructions = buildFlashcardInstructions(inputText, count);
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  const referer = siteUrl || process.env.OPENROUTER_SITE_URL;
  const title = siteTitle || process.env.OPENROUTER_SITE_TITLE;
  if (referer) headers['HTTP-Referer'] = referer;
  if (title) headers['X-Title'] = title;

  const resp = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that outputs strictly JSON when asked.' },
        { role: 'user', content: instructions },
      ]
    })
  });
  if (!resp.ok) throw new Error(await resp.text());
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  return parseFlashcardJson(text);
}

export async function generateFlashcardsWithOpenAI(params: { apiKey: string; model?: string; inputText: string; count: number }) {
  const { apiKey, model = 'gpt-4o-mini', inputText, count } = params;
  const instructions = buildFlashcardInstructions(inputText, count);
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that outputs strictly JSON when asked.' },
        { role: 'user', content: instructions },
      ]
    })
  });
  if (!resp.ok) throw new Error(await resp.text());
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  return parseFlashcardJson(text);
}

export async function generateFlashcardsWithAnthropic(params: { apiKey: string; model?: string; inputText: string; count: number }) {
  const { apiKey, model = 'claude-3-haiku-20240307', inputText, count } = params;
  const instructions = buildFlashcardInstructions(inputText, count);
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'content-type': 'application/json', 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      messages: [ { role: 'user', content: [{ type: 'text', text: instructions }] } ]
    })
  });
  if (!resp.ok) throw new Error(await resp.text());
  const data = await resp.json();
  const text = data.content?.[0]?.text ?? '';
  return parseFlashcardJson(text);
}

export async function generateFlashcardsWithGoogle(params: { apiKey: string; model?: string; inputText: string; count: number; baseUrl?: string }) {
  const { apiKey, model = 'gemini-2.5-flash', inputText, count, baseUrl } = params;
  const ALLOWED_GOOGLE_MODELS = new Set([
    'gemini-2.5-flash',
    'gemini-2.5-flash-preview',
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash'
  ]);
  if (model && !ALLOWED_GOOGLE_MODELS.has(model)) {
    console.warn('[AI][google][flashcards] Invalid model specified:', model);
    throw new Error(`Invalid Google Gemini model: ${model}. Allowed: ${Array.from(ALLOWED_GOOGLE_MODELS).join(', ')}`);
  }
  const base = baseUrl || process.env.GOOGLE_GENAI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
  const instructions = buildFlashcardInstructions(inputText, count);
  const url = `${base}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `You are a helpful assistant that outputs strictly JSON when asked.\n\n${instructions}` }]
        }
      ]
    })
  });
  if (!resp.ok) throw new Error(await resp.text());
  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || p).join('\n') || '';
  return parseFlashcardJson(text);
}

export async function generateFlashcardsWithZAI(params: { apiKey: string; model?: string; inputText: string; count: number; baseUrl?: string }) {
  const { apiKey, model = 'glm-4.6', inputText, count, baseUrl } = params;
  const base = baseUrl || process.env.ZAI_BASE_URL || 'https://api.z.ai/api/paas/v4';
  const instructions = buildFlashcardInstructions(inputText, count);
  const resp = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that outputs strictly JSON when asked.' },
        { role: 'user', content: instructions },
      ]
    })
  });
  if (!resp.ok) throw new Error(await resp.text());
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  return parseFlashcardJson(text);
}

export async function generateFlashcardsBasic(params: { inputText: string; count: number }) {
  const apiKey = process.env.OPENAI_API_KEY || '';
  if (!apiKey) throw new Error('Basic provider not configured. Set OPENAI_API_KEY or use BYO key.');
  return generateFlashcardsWithOpenAI({ apiKey, model: 'gpt-4o-mini', inputText: params.inputText, count: params.count });
}