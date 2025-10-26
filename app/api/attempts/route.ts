import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';
import { cookies } from 'next/headers';
import { grantCookieName, verifyGrantValue } from '@/lib/passcodeGrant';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { set_id, is_guest } = payload;
    if (!set_id) {
      return NextResponse.json({ error: 'Missing set_id' }, { status: 400 });
    }

    const supabase = supabaseServer();

    const { data: set, error: setError } = await supabase
      .from('sets')
      .select('id, passcode_required, passcode_expires_at')
      .eq('id', set_id)
      .single();
    if (setError || !set) {
      return NextResponse.json({ error: 'Set not found' }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    const isSignedIn = !!session?.user?.email;

    const isExpired = !!set.passcode_expires_at && new Date(set.passcode_expires_at) < new Date();
    if (isExpired) {
      return NextResponse.json({ error: 'Passcode expired' }, { status: 403 });
    }
    if (set.passcode_required && !isSignedIn) {
      const cookieName = grantCookieName(set_id);
      const passCookie = cookies().get(cookieName);
      if (!passCookie) {
        return NextResponse.json({ error: 'Passcode required' }, { status: 403 });
      }
      const v = verifyGrantValue(passCookie.value, set_id);
      if (!v.ok) {
        return NextResponse.json({ error: v.expired ? 'Passcode expired' : 'Invalid passcode grant' }, { status: 403 });
      }
    }

    const { data: attempt, error } = await supabase
      .from('attempts')
      .insert({ set_id, is_guest: !!is_guest })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to create attempt' }, { status: 500 });
    }

    return NextResponse.json({ attempt: { id: attempt.id } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
