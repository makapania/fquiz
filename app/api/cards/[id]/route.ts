import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const id = params.id;
  try {
    // Get the card's set_id to check permissions
    const { data: card } = await supabase
      .from('cards')
      .select('set_id')
      .eq('id', id)
      .single();

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Check permissions
    const { canEditSet } = await import('@/lib/permissions');
    const { canEdit } = await canEditSet(card.set_id);
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden: only the owner or public_editable sets can be edited' }, { status: 403 });
    }

    const body = await req.json();
    const update: any = {};

    if (typeof body.prompt === 'string') {
      const p = body.prompt.trim();
      if (p.length === 0) return NextResponse.json({ error: 'prompt cannot be empty' }, { status: 400 });
      update.prompt = p;
    }

    if (typeof body.answer === 'string') {
      const a = body.answer.trim();
      if (a.length === 0) return NextResponse.json({ error: 'answer cannot be empty' }, { status: 400 });
      update.answer = a;
    }

    if (body.explanation !== undefined) {
      if (body.explanation === null) {
        update.explanation = null;
      } else if (typeof body.explanation === 'string') {
        update.explanation = body.explanation;
      } else {
        return NextResponse.json({ error: 'explanation must be string or null' }, { status: 400 });
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'no valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('cards')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ item: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'unknown error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const id = params.id;
  try {
    // Get the card's set_id to check permissions
    const { data: card } = await supabase
      .from('cards')
      .select('set_id')
      .eq('id', id)
      .single();

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Check permissions
    const { canEditSet } = await import('@/lib/permissions');
    const { canEdit } = await canEditSet(card.set_id);
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden: only the owner or public_editable sets can be edited' }, { status: 403 });
    }

    const { error } = await supabase.from('cards').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'unknown error' }, { status: 500 });
  }
}