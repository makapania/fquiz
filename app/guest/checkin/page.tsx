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

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  return (
    <main className="space-y-6 max-w-2xl mx-auto">
      <section className="rounded-lg bg-surface p-4">
        <h2 className="text-xl font-semibold">Check in with FQuiz</h2>
        <p className="text-muted">Sign in to your account or create a new one to get started.</p>
      </section>

      {/* Toggle between Sign In and Create Account */}
      <div className="flex gap-2 border-b border-surface2">
        <button
          className={`px-4 py-2 font-medium ${mode === 'signin' ? 'border-b-2 border-accent text-accent' : 'text-muted'}`}
          onClick={() => setMode('signin')}
        >
          Sign In
        </button>
        <button
          className={`px-4 py-2 font-medium ${mode === 'signup' ? 'border-b-2 border-accent text-accent' : 'text-muted'}`}
          onClick={() => setMode('signup')}
        >
          Create Account
        </button>
      </div>

      {mode === 'signin' ? (
        <section className="rounded-lg bg-surface p-4">
          <h3 className="text-lg font-semibold mb-2">Sign In to Your Account</h3>
          <p className="text-sm text-muted mb-4">Enter your email and password to access your sets.</p>
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
                placeholder="Enter your password"
              />
            </div>
            {error && <p className="text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button disabled={loading} className="rounded-md bg-accent px-4 py-2 text-white">
                {loading ? 'Signing in…' : 'Sign In'}
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
          <p className="text-xs text-muted mt-4">
            Forgot your password? <span className="text-accent">Password reset coming soon</span>
          </p>
        </section>
      ) : (
        <section className="rounded-lg bg-surface p-4">
          <h3 className="text-lg font-semibold mb-2">Create a New Account</h3>
          <p className="text-sm text-muted mb-4">Set up your FQuiz account with an email and password.</p>
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
              <p className="text-xs text-muted mt-1">Choose a strong password to protect your account</p>
            </div>
            <div>
              <label className="block text-sm text-muted">Display Name (optional)</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-md border border-surface2 bg-surface p-2 text-text"
                placeholder="e.g., Alex Learner"
              />
              <p className="text-xs text-muted mt-1">How you want to be shown in the app</p>
            </div>
            {error && <p className="text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button disabled={loading} className="rounded-md bg-accent px-4 py-2 text-white">
                {loading ? 'Creating account…' : 'Create Account'}
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
      )}
    </main>
  );
}