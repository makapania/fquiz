import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseClient';
import { unstable_noStore as noStore } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const dynamic = 'force-dynamic';

// Disable Next.js data cache for this page to ensure fresh results
noStore();

type SetRow = {
  id: string;
  title: string;
  type: 'flashcards' | 'quiz';
  is_published: boolean;
};

export default async function SetsPage() {
  const session = await getServerSession(authOptions);
  const isSignedIn = !!session?.user?.email;

  let sets: SetRow[] = [];
  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('sets')
      .select('id,title,type,is_published,created_at,updated_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    sets = (data as SetRow[]) ?? [];

    // Compute counts explicitly to avoid nested aggregation quirks
    const counts = await Promise.all(
      sets.map(async (s) => {
        const [{ count: cardCount }, { count: questionCount }] = await Promise.all([
          supabase
            .from('cards')
            .select('id', { head: true, count: 'exact' })
            .eq('set_id', s.id),
          supabase
            .from('questions')
            .select('id', { head: true, count: 'exact' })
            .eq('set_id', s.id),
        ]);
        return { id: s.id, cardCount: cardCount || 0, questionCount: questionCount || 0 };
      })
    );

    // Attach counts to sets
    const countMap = new Map(counts.map((c) => [c.id, c]));
    sets = sets.map((s) => {
      const c = countMap.get(s.id);
      return Object.assign({}, s, {
        cardCount: c?.cardCount ?? 0,
        questionCount: c?.questionCount ?? 0,
      }) as any;
    });
  } catch (e) {
    // If Supabase is not configured, show helpful message
    return (
      <main className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Sets</h2>
          <Link className="rounded-md bg-accent px-3 py-2 text-white" href="/sets/new">Create set</Link>
        </div>
        <div className="rounded-md bg-surface2 p-3">
          <p className="text-red-400">Supabase connection not configured. Fill .env.local and restart.</p>
        </div>
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
        {sets.map((s: any) => {
          const countLabel = s.type === 'flashcards' ? `${s.cardCount} cards` : `${s.questionCount} questions`;
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