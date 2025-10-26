"use client";
import { useEffect, useState } from 'react';
import { useSession, signIn, signOut, getProviders, LiteralUnion } from 'next-auth/react';
import type { BuiltInProviderType } from 'next-auth/providers';
import { useGuest } from '../contexts/GuestContext';

export default function WelcomeAuth() {
  const { data: session, status } = useSession();
  const { guestCodename, isGuest, claimCodename, releaseCodename, loading } = useGuest();
  const [providers, setProviders] = useState<Record<LiteralUnion<BuiltInProviderType, string>, { id: string; name: string }> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await getProviders();
        setProviders(p || null);
      } catch {
        setProviders(null);
      }
    })();
  }, []);

  if (status === 'loading') {
    return (
      <div className="rounded-md bg-surface2 p-3 text-muted">Checking sign-in status…</div>
    );
  }

  return (
    <div className="rounded-md bg-surface2 p-3">
      {!session && !isGuest ? (
        <div className="space-y-2">
          <p className="text-sm text-muted">Sign in to create and edit sets, or join as a guest to study existing content.</p>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const hasGoogle = !!(providers && (providers as any)['google']);
              return (
                <>
                  <button
                    className="rounded-md bg-surface px-3 py-2"
                    onClick={() => signIn('google')}
                    disabled={!hasGoogle}
                  >
                    Sign in with Google
                  </button>
                  <button
                    className="rounded-md bg-accent px-3 py-2 text-white"
                    onClick={claimCodename}
                    disabled={loading}
                  >
                    {loading ? 'Joining...' : 'Join as Guest'}
                  </button>
                  {!hasGoogle && (
                    <p className="text-xs text-red-400">Google sign-in not configured. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.</p>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      ) : session ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Signed in as</p>
            <p className="font-medium">{session.user?.email || session.user?.name || 'User'}</p>
          </div>
          <button
            className="rounded-md bg-surface px-3 py-2"
            onClick={async () => {
              // Clear all passcode grant cookies via server API before signing out
              try {
                await fetch('/api/auth/clear-passcodes', { method: 'POST' });
              } catch (e) {
                console.error('Failed to clear passcode cookies:', e);
              }
              signOut();
            }}
          >
            Sign out
          </button>
        </div>
      ) : isGuest ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Guest session</p>
            <p className="font-medium text-accent">{guestCodename}</p>
          </div>
          <button className="rounded-md bg-surface px-3 py-2" onClick={releaseCodename}>End Guest Session</button>
        </div>
      ) : null}
    </div>
  );
}