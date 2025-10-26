import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codename } = body;

    if (!codename || typeof codename !== 'string') {
      return NextResponse.json(
        { error: 'Codename is required' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();
    
    // Call the database function to release the codename
    const { error } = await supabase.rpc('release_codename', { p_name: codename });
    
    if (error) {
      console.error('Error releasing codename:', error);
      return NextResponse.json(
        { error: 'Failed to release codename' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error releasing codename:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}