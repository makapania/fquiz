import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';
import bcrypt from 'bcryptjs';
import { getResetTokenDev, clearResetTokenDev } from '@/lib/devPasswordResetStore';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body.token || '').trim();
    const newPassword = String(body.newPassword || '').trim();
    const emailFromBody = String(body.email || '').trim().toLowerCase();

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_reset_token, password_reset_expires, password_hash')
      .eq('password_reset_token', token)
      .maybeSingle();

    let targetUser = user as any;

    // Dev fallback if migration missing or token not found in DB
    if (!targetUser || error) {
      const devEntry = process.env.NODE_ENV === 'development' ? getResetTokenDev(token) : null;
      // If no devEntry, allow dev fallback via explicit email
      const fallbackEmail = devEntry?.email || (process.env.NODE_ENV === 'development' ? emailFromBody : '');
      if (!fallbackEmail) {
        return NextResponse.json({ error: 'Invalid reset token' }, { status: 400 });
      }
      if (devEntry && devEntry.expiresAt < Date.now()) {
        clearResetTokenDev(token);
        return NextResponse.json({ error: 'Reset token has expired' }, { status: 400 });
      }
      const { data: byEmail, error: emailErr } = await supabase
        .from('users')
        .select('id, email, password_hash')
        .eq('email', fallbackEmail)
        .single();
      if (emailErr || !byEmail) {
        return NextResponse.json({ error: 'Account not found for token' }, { status: 404 });
      }
      targetUser = byEmail;
    } else {
      if (!targetUser.password_reset_expires || new Date(targetUser.password_reset_expires as any) < new Date()) {
        return NextResponse.json({ error: 'Reset token has expired' }, { status: 400 });
      }
    }

    // Disallow password reset for accounts without password_hash (Google-only accounts)
    if (!targetUser.password_hash) {
      return NextResponse.json({ error: 'This account uses Google sign-in. Use Google to sign in.' }, { status: 403 });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    let update;
    if (targetUser.password_reset_token !== undefined) {
      // Normal path when columns exist
      update = await supabase
        .from('users')
        .update({ password_hash, password_reset_token: null, password_reset_expires: null })
        .eq('id', targetUser.id);
    } else {
      // Dev fallback when reset columns don't exist
      update = await supabase
        .from('users')
        .update({ password_hash })
        .eq('id', targetUser.id);
      clearResetTokenDev(token);
    }
    if (update.error) {
      return NextResponse.json({ error: update.error.message || 'Failed to update password' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}