import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const payload = await req.json();
    const allowed = ['title','description','is_published','options'];
    const update: Record<string, any> = {};
    for (const k of allowed) {
      if (payload[k] !== undefined) update[k] = payload[k];
    }
    if (Object.keys(update).length === 0) {
      return new NextResponse('No valid fields to update', { status: 400 });
    }
    const supabase = supabaseServer();
    const { error } = await supabase.from('sets').update(update).eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e.message || 'Server error', { status: 500 });
  }
}