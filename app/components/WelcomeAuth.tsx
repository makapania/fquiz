"use client";
import { useEffect, useState } from 'react';
import { useSession, signIn, signOut, getProviders, LiteralUnion } from 'next-auth/react';
import type { BuiltInProviderType } from 'next-auth/providers';

export default function WelcomeAuth() {
  const { data: session, status } = useSession();
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
      {!session ? (
        <div className="space-y-2">
          <p className="text-sm text-muted">Sign in to create and edit sets. You can browse as a guest.</p>
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
                  {!hasGoogle && (
                    <p className="text-xs text-red-400">Google sign-in not configured. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.</p>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Signed in as</p>
            <p className="font-medium">{session.user?.email || session.user?.name || 'User'}</p>
          </div>
          <button className="rounded-md bg-surface px-3 py-2" onClick={() => signOut()}>Sign out</button>
        </div>
      )}
    </div>
  );
}