import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = supabaseServer();
    const { data: set, error } = await supabase
      .from('sets')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !set) {
      return new NextResponse('Set not found', { status: 404 });
    }

    return NextResponse.json(set);
  } catch (e: any) {
    return new NextResponse(e.message || 'Server error', { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = supabaseServer();

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { data: set, error: setError } = await supabase
      .from('sets')
      .select('id, created_by')
      .eq('id', params.id)
      .single();
    if (setError || !set) {
      return new NextResponse('Set not found', { status: 404 });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();
    if (userError) {
      console.log('[DELETE SET] User lookup error:', userError.message);
    }

    const isOwnerless = !set.created_by;
    const isOwnerMatch = !!(user?.id && set.created_by && user.id === set.created_by);
    if (!isOwnerless && !isOwnerMatch) {
      return new NextResponse('Forbidden: only the owner can delete this set', { status: 403 });
    }

    const { error } = await supabase
      .from('sets')
      .delete()
      .eq('id', params.id);
    if (error) throw error;

    // Verify deletion actually removed the row
    const { data: check, error: checkError } = await supabase
      .from('sets')
      .select('id')
      .eq('id', params.id)
      .single();

    if (!checkError) {
      // Row still exists; deletion did not succeed
      return new NextResponse('Delete failed: row still exists', { status: 500 });
    }

    return NextResponse.json({ ok: true, id: params.id });
  } catch (e: any) {
    return new NextResponse(e.message || 'Server error', { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    // Check permissions first
    const { canEditSet } = await import('@/lib/permissions');
    const { canEdit } = await canEditSet(params.id);
    if (!canEdit) {
      return new NextResponse('Forbidden: only the owner or public_editable sets can be edited', { status: 403 });
    }

    const payload = await req.json();
    const allowed = ['title','description','is_published','options'];
    const update: Record<string, any> = {};
    for (const k of allowed) {
      if (payload[k] !== undefined) update[k] = payload[k];
    }
    // Allow updating type with validation
    if (payload.type !== undefined) {
      const t = String(payload.type);
      if (!['flashcards','quiz'].includes(t)) {
        return new NextResponse('Invalid type', { status: 400 });
      }
      update.type = t;
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