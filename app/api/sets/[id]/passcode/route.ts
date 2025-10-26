import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';
import bcrypt from 'bcryptjs';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const formData = await req.formData();
    const passcode = String(formData.get('passcode') || '');
    if (!passcode) return new NextResponse('Missing passcode', { status: 400 });

    const supabase = supabaseServer();
    const { data: set, error } = await supabase.from('sets').select('passcode_hash, passcode_expires_at, passcode_required').eq('id', params.id).single();
    if (error || !set) throw new Error('Set not found');

    if (!set.passcode_required) {
      return new NextResponse('Passcode not required', { status: 400 });
    }

    if (set.passcode_expires_at && new Date(set.passcode_expires_at) < new Date()) {
      return new NextResponse('Passcode expired', { status: 403 });
    }

    if (!set.passcode_hash) return new NextResponse('No passcode set', { status: 400 });

    const ok = await bcrypt.compare(passcode, set.passcode_hash);
    if (!ok) return new NextResponse('Invalid passcode', { status: 401 });

    const res = NextResponse.redirect(new URL(`/sets/${params.id}`, req.url));
    res.cookies.set(`set_pass_ok_${params.id}`, '1', { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 });
    return res;
  } catch (e: any) {
    return new NextResponse(e.message || 'Server error', { status: 500 });
  }
}