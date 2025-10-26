import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function POST(req: Request) {
  try {
    const { title, type } = await req.json();
    if (!title || !type || !['flashcards','quiz'].includes(type)) {
      return new NextResponse('Invalid payload', { status: 400 });
    }

    const supabase = supabaseServer();

    // Get the current user's ID to set as created_by
    let created_by = null;
    const session = await getServerSession(authOptions);
    console.log('[CREATE SET] Session:', session?.user?.email);
    if (session?.user?.email) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', session.user.email)
        .single();
      console.log('[CREATE SET] User lookup:', { found: !!user, userId: user?.id, error: userError?.message });
      created_by = user?.id || null;
    }
    console.log('[CREATE SET] created_by:', created_by);

    const { data, error } = await supabase
      .from('sets')
      .insert({ title, type, created_by })
      .select('id')
      .single();
    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (e: any) {
    return new NextResponse(e.message || 'Server error', { status: 500 });
  }
}