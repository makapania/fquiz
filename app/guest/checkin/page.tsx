"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GuestCheckinPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/guest/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, display_name: displayName, password }),
      });
      if (!res.ok) {
        try {
          const j = await res.json();
          throw new Error(j?.error || 'Failed to check in');
        } catch {
          const txt = await res.text();
          throw new Error(txt || 'Failed to check in');
        }
      }
      // Mirror cookies in localStorage for client UI conveniences
      try {
        localStorage.setItem('guest_email', email);
        if (displayName) localStorage.setItem('guest_display_name', displayName);
      } catch {}
      router.push('/');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-6">
      <section className="rounded-lg bg-surface p-4">
        <h2 className="text-xl font-semibold">Check in without Google</h2>
        <p className="text-muted">Create a new account or sign in with your existing email and password.</p>
        <p className="text-xs text-muted mt-2">
          <strong>New users:</strong> Your account will be created with the email and password you provide.<br/>
          <strong>Returning users:</strong> Enter the same password you used when you first signed up.
        </p>
      </section>

      <section className="rounded-lg bg-surface p-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-surface2 bg-surface p-2 text-text"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-muted">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 w-full rounded-md border border-surface2 bg-surface p-2 text-text"
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label className="block text-sm text-muted">Username (display name)</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-md border border-surface2 bg-surface p-2 text-text"
              placeholder="e.g., Alex Learner"
            />
          </div>
          {error && <p className="text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button disabled={loading} className="rounded-md bg-accent px-4 py-2 text-white">
              {loading ? 'Checking in…' : 'Continue'}
            </button>
            <button
              type="button"
              className="rounded-md bg-surface px-4 py-2"
              onClick={() => router.push('/')}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}