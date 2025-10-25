import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('questions')
      .select('id,stem,choices,correct_index,explanation')
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
    const { stem, choices, correct_index, explanation } = await req.json();
    if (!stem || !Array.isArray(choices) || choices.length < 2) {
      return new NextResponse('Invalid question payload', { status: 400 });
    }
    if (typeof correct_index !== 'number' || correct_index < 0 || correct_index >= choices.length) {
      return new NextResponse('Invalid correct_index', { status: 400 });
    }
    const supabase = supabaseServer();
    const { error } = await supabase
      .from('questions')
      .insert({ set_id: params.id, stem, choices, correct_index, explanation });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e.message || 'Server error', { status: 500 });
  }
}