import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();

    // Find and delete all passcode grant cookies
    allCookies.forEach((cookie) => {
      if (cookie.name.startsWith('set_pass_ok_')) {
        cookieStore.delete(cookie.name);
      }
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
