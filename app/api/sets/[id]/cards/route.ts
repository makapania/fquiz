import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';
import { cookies } from 'next/headers';
import { grantCookieName, verifyGrantValue } from '@/lib/passcodeGrant';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = supabaseServer();

    // Enforce passcode for accessing cards
    const { data: set, error: setError } = await supabase
      .from('sets')
      .select('passcode_required, passcode_expires_at')
      .eq('id', params.id)
      .single();
    if (setError || !set) {
      return NextResponse.json({ error: 'Set not found' }, { status: 404 });
    }
    const isExpired = !!set.passcode_expires_at && new Date(set.passcode_expires_at) < new Date();
    if (isExpired) {
      return NextResponse.json({ error: 'Passcode expired' }, { status: 403 });
    }
    if (set.passcode_required) {
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
      .from('cards')
      .select('id,kind,prompt,answer,explanation')
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
