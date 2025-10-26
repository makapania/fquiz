import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';
import { grantCookieName, verifyGrantValue } from '@/lib/passcodeGrant';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { set_id, user_id, is_guest } = body;

    if (!set_id) {
      return NextResponse.json({ error: 'set_id required' }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Enforce passcode if required for this set
    const { data: set, error: setError } = await supabase
      .from('sets')
      .select('id, passcode_required, passcode_expires_at')
      .eq('id', set_id)
      .single();
    if (setError || !set) {
      return NextResponse.json({ error: 'Set not found' }, { status: 404 });
    }

    if (set.passcode_required) {
      const name = grantCookieName(set_id);
      const passCookie = req.cookies.get(name);
      if (!passCookie) {
        return NextResponse.json({ error: 'Passcode required' }, { status: 403 });
      }
      const v = verifyGrantValue(passCookie.value, set_id);
      if (!v.ok) {
        return NextResponse.json({ error: v.expired ? 'Passcode expired' : 'Invalid passcode grant' }, { status: 403 });
      }
    }

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
