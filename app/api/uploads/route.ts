import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'file field required' }, { status: 400 });

    const mime = file.type || 'application/octet-stream';
    const name = file.name || 'upload';

    // For now, support text/* and markdown only
    const isText = mime.startsWith('text/') || mime === 'text/markdown' || name.endsWith('.md') || name.endsWith('.txt');
    if (!isText) return NextResponse.json({ error: 'Only text/markdown supported for now' }, { status: 415 });

    const buf = await file.arrayBuffer();
    const parsedText = new TextDecoder().decode(Buffer.from(buf));

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('uploads')
      .insert({ file_name: name, mime, parsed_text: parsedText })
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ id: data.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}