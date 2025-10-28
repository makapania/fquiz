import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Create response to clear guest cookies
    const res = NextResponse.json({ ok: true, message: 'Checked out successfully' });
    
    // Clear guest check-in cookies
    res.cookies.set('guest_email', '', {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0, // Expire immediately
    });
    
    res.cookies.set('guest_display_name', '', {
      httpOnly: false,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0, // Expire immediately
    });
    
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}