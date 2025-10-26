import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseServer();
    
    // Call the database function to claim a codename
    const { data: codename, error } = await supabase.rpc('claim_codename');
    
    if (error) {
      console.error('Error claiming codename:', error);
      return NextResponse.json(
        { error: 'Failed to claim codename' },
        { status: 500 }
      );
    }

    return NextResponse.json({ codename });
  } catch (error) {
    console.error('Unexpected error claiming codename:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}