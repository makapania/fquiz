import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';
import crypto from 'crypto';
import { putResetTokenDev } from '@/lib/devPasswordResetStore';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    let email = '';
    const ct = (req.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('application/json')) {
      const body = await req.json();
      email = String((body as any).email ?? '').trim().toLowerCase();
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      const raw = (await req.text()).trim();
      const params = new URLSearchParams(raw);
      email = String(params.get('email') ?? '').trim().toLowerCase();
    } else {
      const raw = (await req.text()).trim();
      try {
        const maybe = JSON.parse(raw);
        email = String((maybe as any).email ?? '').trim().toLowerCase();
      } catch {
        email = '';
      }
    }
    
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Find user by email
    let user: any = null;
    {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, password_hash')
        .eq('email', email)
        .single();
      if (!error) user = data;
    }

    // Always return success to prevent email enumeration
    if (!user || !user.password_hash) {
      return NextResponse.json({ ok: true });
    }

    // Generate reset token and expiry (1 hour)
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { error: updateErr } = await supabase
      .from('users')
      .update({ password_reset_token: token, password_reset_expires: expires })
      .eq('id', user.id);
    if (updateErr) {
      // Dev fallback when migration isn't applied yet
      if (process.env.NODE_ENV === 'development') {
        putResetTokenDev(token, email, expires);
        console.warn('[PasswordReset][DEV] Using in-memory token store because DB update failed:', updateErr.message);
      } else {
        return NextResponse.json({ error: updateErr.message || 'Failed to set reset token' }, { status: 500 });
      }
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    // In dev, include email as a query param to aid local testing when migration isn't applied
    const resetUrl = process.env.NODE_ENV === 'development'
      ? `${baseUrl}/reset-password/${token}?email=${encodeURIComponent(email)}`
      : `${baseUrl}/reset-password/${token}`;
    console.log(`[PasswordReset] Reset URL for ${email}: ${resetUrl}`);

    const devPayload: Record<string, any> = { ok: true };
    if (process.env.NODE_ENV === 'development') {
      devPayload.devResetUrl = resetUrl;
    }
    return NextResponse.json(devPayload);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}