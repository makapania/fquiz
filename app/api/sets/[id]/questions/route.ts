import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';
import { cookies } from 'next/headers';
import { grantCookieName, verifyGrantValue } from '@/lib/passcodeGrant';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = supabaseServer();

    // Enforce passcode for accessing questions
    const { data: set, error: setError } = await supabase
      .from('sets')
      .select('passcode_required, passcode_expires_at')
      .eq('id', params.id)
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
      const cookieName = grantCookieName(params.id);
      const passCookie = cookies().get(cookieName);
      if (!passCookie) {
        return NextResponse.json({ error: 'Passcode required' }, { status: 403 });
      }
      const v = verifyGrantValue(passCookie.value, params.id);
      if (!v.ok) {
        return NextResponse.json({ error: v.expired ? 'Passcode expired' : 'Invalid passcode grant' }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from('questions')
      .select('id,stem,choices,correct_index,explanation')
      .eq('set_id', params.id)
      .order('id', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ items: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
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

    // Bump parent set's updated_at so lists reflect recent changes
    try {
      await supabase
        .from('sets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', params.id);
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e.message || 'Server error', { status: 500 });
  }
}
