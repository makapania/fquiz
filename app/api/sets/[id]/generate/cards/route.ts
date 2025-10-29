import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { generateFlashcardsBasic, generateFlashcardsWithOpenAI, generateFlashcardsWithAnthropic, generateFlashcardsWithZAI, generateFlashcardsWithOpenRouter, generateFlashcardsWithGoogle } from '@/lib/aiProviders';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email || '';
    const allowed = (process.env.DEV_ALLOWED_EMAILS || 'matt.sponheimer@gmail.com')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (!email || !allowed.includes(email)) {
      return NextResponse.json({ error: 'Developer-only feature' }, { status: 403 });
    }

    const body = await req.json();
    const source = String(body.source || 'prompt'); // 'prompt' | 'upload'
    const provider = String(body.provider || process.env.DEFAULT_AI_PROVIDER || 'google'); // 'basic' | 'openai' | 'anthropic' | 'zai' | 'openrouter' | 'google'
    const count = Math.max(1, Math.min(50, Number(body.count || 10)));
    const apiKey = body.api_key ? String(body.api_key) : undefined;
    const model = body.model ? String(body.model) : undefined;
    const baseUrl = body.base_url ? String(body.base_url) : undefined;

    let inputText = '';
    const supabase = supabaseServer();

    if (source === 'upload') {
      const uploadId = String(body.upload_id || '');
      if (!uploadId) return NextResponse.json({ error: 'upload_id required' }, { status: 400 });
      const { data: upload, error } = await supabase
        .from('uploads')
        .select('id,parsed_text')
        .eq('id', uploadId)
        .single();
      if (error || !upload) return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
      inputText = upload.parsed_text || '';
      if (!inputText) return NextResponse.json({ error: 'Upload has no parsed_text' }, { status: 400 });
    } else {
      inputText = String(body.prompt || '').trim();
      if (!inputText) return NextResponse.json({ error: 'prompt required' }, { status: 400 });
    }

    const start = Date.now();
    let cards: Array<{ term: string; answer: string; explanation?: string | null }> = [];
    if (provider === 'openai') {
      const key = apiKey || process.env.OPENAI_API_KEY || '';
      if (!key) return NextResponse.json({ error: 'OPENAI_API_KEY missing' }, { status: 400 });
      cards = await generateFlashcardsWithOpenAI({ apiKey: key, model, inputText, count });
    } else if (provider === 'anthropic') {
      const key = apiKey || process.env.ANTHROPIC_API_KEY || '';
      if (!key) return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing' }, { status: 400 });
      cards = await generateFlashcardsWithAnthropic({ apiKey: key, model, inputText, count });
    } else if (provider === 'zai') {
      const key = apiKey || process.env.ZAI_API_KEY || '';
      if (!key) return NextResponse.json({ error: 'ZAI_API_KEY missing' }, { status: 400 });
      cards = await generateFlashcardsWithZAI({ apiKey: key, model, inputText, count, baseUrl });
    } else if (provider === 'openrouter') {
      const key = apiKey || process.env.OPENROUTER_API_KEY || '';
      if (!key) return NextResponse.json({ error: 'OPENROUTER_API_KEY missing' }, { status: 400 });
      const siteUrl = req.headers.get('referer') || undefined;
      const siteTitle = 'FQuiz';
      cards = await generateFlashcardsWithOpenRouter({ apiKey: key, model, inputText, count, siteUrl, siteTitle, baseUrl });
    } else if (provider === 'google') {
      const key = apiKey || process.env.GOOGLE_GENAI_API_KEY || '';
      if (!key) return NextResponse.json({ error: 'GOOGLE_GENAI_API_KEY missing' }, { status: 400 });
      cards = await generateFlashcardsWithGoogle({ apiKey: key, model, inputText, count, baseUrl });
    } else {
      cards = await generateFlashcardsBasic({ inputText, count });
    }

    const latencyMs = Date.now() - start;
    console.log('[AI][cards] provider=%s model=%s count=%d source=%s latencyMs=%d', provider, model || '-', count, source, latencyMs);

    // Insert into DB
    const rows = cards.map((c) => ({ set_id: params.id, kind: 'term', prompt: c.term, answer: c.answer, explanation: c.explanation ?? null }));
    const { data, error } = await supabase.from('cards').insert(rows).select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ inserted: data?.length ?? 0 });
  } catch (e: any) {
    console.error('[AI][cards][error]', { message: e?.message, stack: e?.stack });
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
