"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PasscodeForm({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/sets/${id}/passcode`, {
        method: 'POST',
        body: form,
        // same-origin ensures cookies set by the server are applied
        credentials: 'same-origin',
      });

      // Treat 2xx and 3xx as success; 3xx comes from server redirect
      if ((res.status >= 200 && res.status < 300) || (res.status >= 300 && res.status < 400)) {
        router.push(`/sets/${id}`);
        router.refresh();
        return;
      }

      const msg = await res.text();
      setError(msg || 'Invalid passcode');
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-sm text-muted">Enter passcode</label>
        <input name="passcode" type="password" className="mt-1 w-full rounded-md border border-surface2 bg-surface p-2 text-text" required />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button className="rounded-md bg-accent px-4 py-2 text-white" disabled={loading}>
        {loading ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
}