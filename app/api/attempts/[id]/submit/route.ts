import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = supabaseServer();

    // Update attempt with submitted timestamp
    const { data: attempt, error } = await supabase
      .from('attempts')
      .update({ submitted_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    // Get summary of responses
    const { data: responses, error: rError } = await supabase
      .from('responses')
      .select('correct')
      .eq('attempt_id', params.id);

    if (rError) throw rError;

    const total = responses?.length || 0;
    const correctCount = responses?.filter(r => r.correct).length || 0;

    return NextResponse.json({
      attempt,
      summary: {
        total,
        correct: correctCount,
        incorrect: total - correctCount,
        percentage: total > 0 ? Math.round((correctCount / total) * 100) : 0,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
