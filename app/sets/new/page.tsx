"use client";
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function NewSetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = (searchParams.get('type') === 'quiz') ? 'quiz' : 'flashcards';
  const [title, setTitle] = useState("");
  const [type, setType] = useState<'flashcards'|'quiz'>(initialType);
  const [error, setError] = useState<string|undefined>();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch('/api/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to create set');
      }
      const data = await res.json();
      router.push(`/sets/${data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">Create a new set</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm text-muted">Title</label>
          <input value={title} onChange={(e)=>setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-surface2 bg-surface p-2 text-text" required />
        </div>
        <div>
          <label className="block text-sm text-muted">Type</label>
          <select value={type} onChange={(e)=>setType(e.target.value as any)}
            className="mt-1 w-full rounded-md border border-surface2 bg-surface p-2 text-text">
            <option value="flashcards">Flashcards</option>
            <option value="quiz">Quiz</option>
          </select>
        </div>
        {error && <p className="text-red-400">{error}</p>}
        <button disabled={loading} className="rounded-md bg-accent px-4 py-2 text-white">
          {loading ? 'Creating...' : 'Create'}
        </button>
      </form>
    </main>
  );
}

export default function NewSetPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewSetForm />
    </Suspense>
  );
}