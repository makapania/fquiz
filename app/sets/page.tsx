import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseClient';

export default async function SetsPage() {
  let sets: Array<{ id: string; title: string; type: string; is_published: boolean }>= [];
  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('sets')
      .select('id,title,type,is_published')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    sets = data ?? [];
  } catch (e) {
    // If Supabase is not configured, show helpful message
    return (
      <main className="space-y-4">
        <h2 className="text-xl font-semibold">Sets</h2>
        <p className="text-muted">Supabase connection not configured. Fill .env.local and restart.</p>
        <Link className="rounded-md bg-accent px-3 py-2 text-white" href="/sets/new">Create set</Link>
      </main>
    );
  }

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Sets</h2>
        <Link className="rounded-md bg-accent px-3 py-2 text-white" href="/sets/new">Create set</Link>
      </div>
      <ul className="space-y-2">
        {sets.map((s) => (
          <li key={s.id} className="rounded-md bg-surface2 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-muted">{s.type} · {s.is_published ? 'Published' : 'Draft'}</p>
              </div>
              <Link className="text-accent" href={`/sets/${s.id}`}>Open</Link>
            </div>
          </li>
        ))}
        {sets.length === 0 && (
          <li className="text-muted">No sets yet. Create one.</li>
        )}
      </ul>
    </main>
  );
}