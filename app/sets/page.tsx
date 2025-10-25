import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseClient';

type SetRow = {
  id: string;
  title: string;
  type: 'flashcards' | 'quiz';
  is_published: boolean;
  cards?: Array<{ count: number }>;
  questions?: Array<{ count: number }>;
};

export default async function SetsPage() {
  let sets: SetRow[] = [];
  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('sets')
      .select('id,title,type,is_published,cards(count),questions(count)')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    sets = (data as SetRow[]) ?? [];
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
        {sets.map((s) => {
          const cardCount = Array.isArray(s.cards) && s.cards[0]?.count ? s.cards[0].count : 0;
          const questionCount = Array.isArray(s.questions) && s.questions[0]?.count ? s.questions[0].count : 0;
          const countLabel = s.type === 'flashcards' ? `${cardCount} cards` : `${questionCount} questions`;
          return (
            <li key={s.id} className="rounded-md bg-surface2 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm text-muted">{s.type} · {s.is_published ? 'Published' : 'Draft'} · {countLabel}</p>
                </div>
                <Link className="text-accent" href={`/sets/${s.id}`}>Open</Link>
              </div>
            </li>
          );
        })}
        {sets.length === 0 && (
          <li className="text-muted">No sets yet. Create one.</li>
        )}
      </ul>
    </main>
  );
}