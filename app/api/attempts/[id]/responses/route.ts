import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { question_id, chosen_index, time_spent_ms } = body;

    if (question_id === undefined || chosen_index === undefined) {
      return NextResponse.json({ error: 'question_id and chosen_index required' }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Get the correct answer for this question
    const { data: question, error: qError } = await supabase
      .from('questions')
      .select('correct_index')
      .eq('id', question_id)
      .single();

    if (qError || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const correct = question.correct_index === chosen_index;

    // Insert response
    const { data: response, error } = await supabase
      .from('responses')
      .insert({
        attempt_id: params.id,
        question_id,
        chosen_index,
        correct,
        time_spent_ms: time_spent_ms || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ response, correct });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
