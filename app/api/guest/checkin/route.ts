import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';
import bcrypt from 'bcryptjs';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const display_name = String(body.display_name || '').trim();
    const password = String(body.password || '').trim();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Find or create user by email
    const { data: existing, error: findErr } = await supabase
      .from('users')
      .select('id, email, display_name, password_hash')
      .eq('email', email)
      .single();

    let userId = existing?.id || null;

    if (!existing) {
      const password_hash = await bcrypt.hash(password, 10);
      const { data: created, error: insertErr } = await supabase
        .from('users')
        .insert({ email, display_name: display_name || null, password_hash })
        .select('id')
        .single();
      if (insertErr) {
        return NextResponse.json({ error: insertErr.message || 'Failed to create user' }, { status: 500 });
      }
      userId = created?.id || null;
    } else {
      // User exists - they must provide the correct password
      if (existing.password_hash) {
        // User has a password set - verify it
        const ok = await bcrypt.compare(password, existing.password_hash as string);
        if (!ok) {
          return NextResponse.json({ error: 'Incorrect password for this email address' }, { status: 401 });
        }
      } else {
        // User exists but has no password (likely created via Google OAuth)
        // For security, we don't allow password setting via this endpoint
        return NextResponse.json({ 
          error: 'This email is already registered. Please sign in with Google or contact support if you need to set a password.' 
        }, { status: 403 });
      }

      // Update display name if changed
      if (display_name && display_name !== existing.display_name) {
        const { error: updateErr } = await supabase
          .from('users')
          .update({ display_name })
          .eq('id', existing.id);
        if (updateErr) {
          return NextResponse.json({ error: updateErr.message || 'Failed to update profile' }, { status: 500 });
        }
      }
    }

    const res = NextResponse.json({ ok: true, userId });
    // Set guest check-in cookies for server-side pages to use
    res.cookies.set('guest_email', email, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    if (display_name) {
      res.cookies.set('guest_display_name', display_name, {
        httpOnly: false,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}