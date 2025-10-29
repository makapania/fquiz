"use client";
import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = String(params?.token || '');
  const search = useSearchParams();
  const email = String(search.get('email') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (password.length < 6) throw new Error('Password must be at least 6 characters');
      if (password !== confirm) throw new Error('Passwords do not match');
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password, email }),
      });
      if (!res.ok) {
        try {
          const j = await res.json();
          throw new Error(j?.error || 'Failed to reset password');
        } catch {
          const txt = await res.text();
          throw new Error(txt || 'Failed to reset password');
        }
      }
      setSuccess('Password updated. You can now sign in.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-6 max-w-xl mx-auto">
      <section className="rounded-lg bg-surface p-4">
        <h2 className="text-xl font-semibold">Reset your password</h2>
        <p className="text-muted">Enter a new password for your account.</p>
      </section>

      <section className="rounded-lg bg-surface p-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted">New Password</label>
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
            <label className="block text-sm text-muted">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              className="mt-1 w-full rounded-md border border-surface2 bg-surface p-2 text-text"
              placeholder="Re-enter your password"
            />
          </div>
          {error && <p className="text-red-400">{error}</p>}
          {success && <p className="text-green-500">{success}</p>}
          <div className="flex gap-2">
            <button disabled={loading} className="rounded-md bg-accent px-4 py-2 text-white">
              {loading ? 'Updating…' : 'Update Password'}
            </button>
            <Link href="/guest/checkin" className="rounded-md bg-surface px-4 py-2">Back to Sign In</Link>
          </div>
        </form>
      </section>
    </main>
  );
}