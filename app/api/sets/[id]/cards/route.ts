import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('cards')
      .select('id,kind,prompt,answer,explanation')
      .eq('set_id', params.id)
      .order('id', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ items: data ?? [] });
  } catch (e: any) {
    return new NextResponse(e.message || 'Server error', { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { prompt, answer, explanation } = await req.json();
    if (!prompt || !answer) {
      return new NextResponse('Missing prompt or answer', { status: 400 });
    }
    const supabase = supabaseServer();
    const { error } = await supabase
      .from('cards')
      .insert({ set_id: params.id, kind: 'term', prompt, answer, explanation });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e.message || 'Server error', { status: 500 });
  }
}