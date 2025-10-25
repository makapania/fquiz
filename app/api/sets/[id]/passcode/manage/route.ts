import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';
import bcrypt from 'bcryptjs';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const passcode: string = String(body.passcode || '');
    const required: boolean = body.required !== undefined ? !!body.required : true;
    const expiresAt: string | null = body.expiresAt ?? null;

    if (!passcode) return new NextResponse('Missing passcode', { status: 400 });

    const hash = await bcrypt.hash(passcode, 10);
    const update: Record<string, any> = {
      passcode_hash: hash,
      passcode_required: required,
      passcode_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    };

    const supabase = supabaseServer();
    const { error } = await supabase.from('sets').update(update).eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e.message || 'Server error', { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = supabaseServer();
    const { error } = await supabase
      .from('sets')
      .update({ passcode_hash: null, passcode_required: false, passcode_expires_at: null })
      .eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e.message || 'Server error', { status: 500 });
  }
}