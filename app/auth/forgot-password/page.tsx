"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setDevResetUrl(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        try {
          const j = await res.json();
          throw new Error(j?.error || 'Failed to request reset');
        } catch {
          const txt = await res.text();
          throw new Error(txt || 'Failed to request reset');
        }
      }
      const j = await res.json();
      setSuccess('If an account exists for this email, a reset link has been generated. Check your email.');
      if (j.devResetUrl) {
        setDevResetUrl(j.devResetUrl);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-6 max-w-xl mx-auto">
      <section className="rounded-lg bg-surface p-4">
        <h2 className="text-xl font-semibold">Forgot your password?</h2>
        <p className="text-muted">Enter your email and we'll send you a link to reset your password.</p>
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
          {error && <p className="text-red-400">{error}</p>}
          {success && <p className="text-green-500">{success}</p>}
          {devResetUrl && (
            <p className="text-xs text-muted">Dev reset link: <Link href={devResetUrl} className="text-accent">{devResetUrl}</Link></p>
          )}
          <div className="flex gap-2">
            <button disabled={loading} className="rounded-md bg-accent px-4 py-2 text-white">
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
            <Link href="/guest/checkin" className="rounded-md bg-surface px-4 py-2">Back to Sign In</Link>
          </div>
        </form>
      </section>
    </main>
  );
}