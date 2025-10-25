import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { set_id, user_id, is_guest } = body;

    if (!set_id) {
      return NextResponse.json({ error: 'set_id required' }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Create attempt record
    const attemptData: any = {
      set_id,
      is_guest: is_guest ?? false,
      started_at: new Date().toISOString(),
    };

    if (user_id) {
      attemptData.user_id = user_id;
    }

    const { data: attempt, error } = await supabase
      .from('attempts')
      .insert(attemptData)
      .select('id, set_id, started_at')
      .single();

    if (error) throw error;

    return NextResponse.json({ attempt });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
