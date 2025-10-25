import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabaseClient';
import Link from 'next/link';
import AdminControls from './AdminControls';
import ContentEditor from './ContentEditor';

export default async function SetDetailPage({ params }: { params: { id: string } }) {
  try {
    const supabase = supabaseServer();
    const { data: set, error } = await supabase.from('sets').select('*').eq('id', params.id).single();
    if (error || !set) throw new Error('Failed to load set');

    const passCookie = cookies().get(`set_pass_ok_${params.id}`);
    const needsPass = !!set.passcode_required && (!passCookie);
    return (
      <main className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{set.title}</h2>
          <Link className="text-accent" href="/sets">Back</Link>
        </div>
        <p className="text-muted">Type: {set.type}</p>
        {set.description && <p>{set.description}</p>}
        {needsPass ? (
          <PasscodeForm id={params.id} />
        ) : (
          <div className="space-y-4">
            <div className="rounded-md bg-surface2 p-4">
              <p>Content goes here (flashcards or quiz items).</p>
            </div>
            <ContentEditor id={params.id} type={set.type} />
          </div>
        )}
        <AdminControls id={params.id} initial={{ is_published: !!set.is_published, passcode_required: !!set.passcode_required, passcode_expires_at: set.passcode_expires_at, type: set.type }} />
      </main>
    );
  } catch (e) {
    return (
      <main className="space-y-4">
        <p className="text-red-400">Supabase connection not configured. Fill .env.local and restart.</p>
        <Link className="text-accent" href="/sets">Back to sets</Link>
      </main>
    );
  }
}

function PasscodeForm({ id }: { id: string }) {
  return (
    <form action={`/api/sets/${id}/passcode`} method="POST" className="space-y-3">
      <div>
        <label className="block text-sm text-muted">Enter passcode</label>
        <input name="passcode" type="password" className="mt-1 w-full rounded-md border border-surface2 bg-surface p-2 text-text" required />
      </div>
      <button className="rounded-md bg-accent px-4 py-2 text-white">Submit</button>
    </form>
  );
}