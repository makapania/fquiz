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

export default async function HomePage() {
  const supabase = supabaseServer();
  let recent: SetRow[] = [];
  try {
    const { data } = await supabase
      .from('sets')
      .select('id,title,type,is_published,cards(count),questions(count)')
      .order('updated_at', { ascending: false })
      .limit(5);
    recent = (data as SetRow[]) ?? [];
  } catch {}

  return (
    <main className="space-y-6">
      <section className="rounded-lg bg-surface p-4">
        <h2 className="text-xl font-medium">Welcome</h2>
        <p className="text-muted">Study flashcards or take quizzes. Sign in or join as a guest.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-stretch">
        <div className="rounded-lg bg-cardSurface p-4 text-cardText flex flex-col min-h-40">
          <h3 className="text-lg font-semibold">Flashcards</h3>
          <p>White/off-white surface for readability. Tap to flip.</p>
          <Link href="/sets/new?type=flashcards" className="mt-auto inline-block rounded-md bg-accent px-3 py-1 text-white">Start with Flashcards</Link>
        </div>
        <div className="rounded-lg bg-surface2 p-4 flex flex-col min-h-40">
          <h3 className="text-lg font-semibold">Quizzes</h3>
          <p className="text-muted">Multiple-choice with 4 or 5 options, instant or deferred reveal.</p>
          <Link href="/sets/new?type=quiz" className="mt-auto inline-block rounded-md bg-accent px-3 py-1 text-white">Start with Quiz</Link>
        </div>
      </section>

      <section className="rounded-lg bg-surface p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Sets</h3>
          <Link href="/sets" className="text-accent">View all</Link>
        </div>
        <ul className="mt-2 space-y-2">
          {recent.length === 0 ? (
            <li className="text-muted">No sets yet. Create one.</li>
          ) : recent.map((s) => {
            const cardCount = Array.isArray(s.cards) && s.cards[0]?.count ? s.cards[0].count : 0;
            const questionCount = Array.isArray(s.questions) && s.questions[0]?.count ? s.questions[0].count : 0;
            const countLabel = s.type === 'flashcards' ? `${cardCount} cards` : `${questionCount} questions`;
            return (
              <li key={s.id} className="flex items-center justify-between rounded-md bg-surface2 p-3">
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm text-muted">{s.type} · {s.is_published ? 'Published' : 'Draft'} · {countLabel}</p>
                </div>
                <Link className="text-accent" href={`/sets/${s.id}`}>Open</Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-lg bg-surface p-4">
        <Link href="/sets" className="rounded-md bg-accent px-4 py-2 text-white">Get Started</Link>
      </section>
    </main>
  );
}