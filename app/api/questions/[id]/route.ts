import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const id = params.id;
  try {
    // Get the question's set_id to check permissions
    const { data: question } = await supabase
      .from('questions')
      .select('set_id')
      .eq('id', id)
      .single();

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Check permissions
    const { canEditSet } = await import('@/lib/permissions');
    const { canEdit } = await canEditSet(question.set_id);
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden: only the owner or public_editable sets can be edited' }, { status: 403 });
    }

    const body = await req.json();
    const update: any = {};

    if (typeof body.stem === 'string') {
      const s = body.stem.trim();
      if (s.length === 0) return NextResponse.json({ error: 'stem cannot be empty' }, { status: 400 });
      update.stem = s;
    }

    if (Array.isArray(body.choices)) {
      if (body.choices.length < 2 || body.choices.length > 5) {
        return NextResponse.json({ error: 'choices must have 2–5 items' }, { status: 400 });
      }
      const normalized = body.choices.map((c: any) => (typeof c === 'string' ? c : String(c))).map((c: string) => c.trim());
      if (normalized.some((c: string) => c.length === 0)) {
        return NextResponse.json({ error: 'choices cannot be empty' }, { status: 400 });
      }
      update.choices = normalized;
    }

    if (body.correct_index !== undefined) {
      const ci = Number(body.correct_index);
      if (!Number.isInteger(ci)) return NextResponse.json({ error: 'correct_index must be integer' }, { status: 400 });
      // If choices provided in this request, bound to that length, else allow 0..4 and rely on DB check
      const maxIdx = update.choices ? update.choices.length - 1 : 4;
      if (ci < 0 || ci > maxIdx) return NextResponse.json({ error: `correct_index must be between 0 and ${maxIdx}` }, { status: 400 });
      update.correct_index = ci;
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
      .from('questions')
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
    // Get the question's set_id to check permissions
    const { data: question } = await supabase
      .from('questions')
      .select('set_id')
      .eq('id', id)
      .single();

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Check permissions
    const { canEditSet } = await import('@/lib/permissions');
    const { canEdit } = await canEditSet(question.set_id);
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden: only the owner or public_editable sets can be edited' }, { status: 403 });
    }

    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'unknown error' }, { status: 500 });
  }
}