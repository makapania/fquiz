import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const { title, type } = await req.json();
    if (!title || !type || !['flashcards','quiz'].includes(type)) {
      return new NextResponse('Invalid payload', { status: 400 });
    }
    const supabase = supabaseServer();
    const { data, error } = await supabase.from('sets').insert({ title, type }).select('id').single();
    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (e: any) {
    return new NextResponse(e.message || 'Server error', { status: 500 });
  }
}