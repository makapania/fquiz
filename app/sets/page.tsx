import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseClient';
import { unstable_noStore as noStore } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { cookies } from 'next/headers';

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
  const guestEmailCookie = cookies().get('guest_email');
  const guestEmail = guestEmailCookie?.value || null;

  let currentUserId: string | null = null;

  let mySets: SetRow[] = [];
  let generalSets: SetRow[] = [];
  try {
    const supabase = supabaseServer();
    // Identify current user by session or guest check-in cookie
    const emailForUser = (session?.user?.email || guestEmail);
    if (emailForUser) {
      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('email', emailForUser)
        .single();
      currentUserId = userRow?.id || null;
    }

    // My Sets: owned by current user (include drafts)
    if (currentUserId) {
      const { data: mine, error: myErr } = await supabase
        .from('sets')
        .select('id,title,type,is_published,created_at,updated_at')
        .eq('created_by', currentUserId)
        .order('created_at', { ascending: false });
      if (myErr) throw myErr;
      mySets = (mine as SetRow[]) ?? [];
    }

    // General Sets: published only
    {
      const { data: pub, error: pubErr } = await supabase
        .from('sets')
        .select('id,title,type,is_published,created_at,updated_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (pubErr) throw pubErr;
      generalSets = (pub as SetRow[]) ?? [];
    }

    // Compute counts explicitly to avoid nested aggregation quirks
    async function attachCounts(list: SetRow[]) {
      const counts = await Promise.all(
        list.map(async (s) => {
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
      const countMap = new Map(counts.map((c) => [c.id, c]));
      return list.map((s) => {
        const c = countMap.get(s.id);
        return Object.assign({}, s, {
          cardCount: c?.cardCount ?? 0,
          questionCount: c?.questionCount ?? 0,
        }) as any;
      });
    }

    mySets = await attachCounts(mySets);
    generalSets = await attachCounts(generalSets);
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

      {/* My Sets */}
      <section className="space-y-2">
        <h3 className="text-lg font-semibold">My Sets</h3>
        <ul className="space-y-2">
          {mySets.map((s: any) => {
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
          {mySets.length === 0 && (
            <li className="text-muted">No personal sets yet.</li>
          )}
        </ul>
      </section>

      {/* General Sets */}
      <section className="space-y-2">
        <h3 className="text-lg font-semibold">General Sets</h3>
        <ul className="space-y-2">
          {generalSets.map((s: any) => {
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
          {generalSets.length === 0 && (
            <li className="text-muted">No published sets available.</li>
          )}
        </ul>
      </section>
    </main>
  );
}