import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabaseClient';
import Link from 'next/link';
import AdminControls from './AdminControls';
import EditorWithSession from './EditorWithSession';
import PasscodeForm from './PasscodeForm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { grantCookieName, verifyGrantValue } from '@/lib/passcodeGrant';
import { unstable_noStore as noStore } from 'next/cache';

noStore();

export default async function SetDetailPage({ params }: { params: { id: string } }) {
  try {
    const supabase = supabaseServer();
    const { data: set, error } = await supabase.from('sets').select('*').eq('id', params.id).single();
    if (error || !set) throw new Error('Failed to load set');

    const session = await getServerSession(authOptions);
    const isSignedIn = !!session?.user?.email;
    const publicEditable = !!(set.options && set.options.public_editable);

    // Check if the signed-in user is the owner of this set
    let isOwner = false;
    if (isSignedIn && set.created_by) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', session.user.email)
        .single();

      console.log('[OWNER CHECK]', {
        sessionEmail: session.user.email,
        userFound: !!user,
        userId: user?.id,
        setCreatedBy: set.created_by,
        match: user?.id === set.created_by,
        userError: userError?.message
      });

      isOwner = user?.id === set.created_by;
    } else {
      console.log('[OWNER CHECK SKIPPED]', { isSignedIn, hasCreatedBy: !!set.created_by });
    }

    const canEdit = isSignedIn || publicEditable; // Signed-in users can edit
    const canAdmin = isSignedIn; // Signed-in users can access admin controls

    // Check passcode grant cookie - must verify signature, not just existence
    const cookieName = grantCookieName(params.id);
    const passCookie = cookies().get(cookieName);

    let hasValidPasscode = false;
    if (passCookie) {
      const verification = verifyGrantValue(passCookie.value, params.id);
      hasValidPasscode = verification.ok && !verification.expired;
    }

    // Check if passcode is expired at DB level
    const isExpired = !!set.passcode_expires_at && new Date(set.passcode_expires_at) < new Date();

    // Use owner bypass if we have owner info, otherwise allow signed-in users to bypass
    const needsPass = !!set.passcode_required && !hasValidPasscode && !isOwner && !isSignedIn;
    return (
      <main className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{set.title}</h2>
          <Link className="text-accent" href="/sets">Back</Link>
        </div>
        <p className="text-muted">Type: {set.type}</p>
        {set.description && <p>{set.description}</p>}
        {needsPass ? (
          isExpired ? (
            <div className="rounded-md bg-red-900/30 p-4">
              <p className="text-red-400 font-semibold">Passcode expired</p>
              <p className="text-sm text-muted">Contact the creator to update access or disable passcode.</p>
            </div>
          ) : (
            <PasscodeForm id={params.id} />
          )
        ) : (
          <div className="space-y-4">
            {set.type === 'quiz' && (set.is_published || isOwner) && (
              <div className="rounded-md bg-accent/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Take this quiz</h3>
                    <p className="text-sm text-muted">Test your knowledge</p>
                  </div>
                  <Link
                    href={`/sets/${params.id}/take`}
                    className="rounded-md bg-accent px-6 py-2 font-medium text-white hover:bg-accent/90"
                  >
                    Start Quiz
                  </Link>
                </div>
              </div>
            )}
            {set.type === 'flashcards' && (set.is_published || isOwner) && (
              <div className="rounded-md bg-accent/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Study these flashcards</h3>
                    <p className="text-sm text-muted">Review and memorize</p>
                  </div>
                  <Link
                    href={`/sets/${params.id}/study`}
                    className="rounded-md bg-accent px-6 py-2 font-medium text-white hover:bg-accent/90"
                  >
                    Start Studying
                  </Link>
                </div>
              </div>
            )}
            {canEdit ? (
              <EditorWithSession id={params.id} type={set.type} />
            ) : (
              <div className="rounded-md bg-surface2 p-4">
                <p className="text-sm text-muted">Sign in to edit this set{publicEditable ? ' • Public editing is currently enabled' : ''}.</p>
              </div>
            )}
          </div>
        )}
        {canAdmin && (
          <AdminControls id={params.id} initial={{ is_published: !!set.is_published, passcode_required: !!set.passcode_required, passcode_expires_at: set.passcode_expires_at, type: set.type, options: set.options || {} }} isOwner={isOwner || (!set.created_by && isSignedIn)} />
        )}
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

// PasscodeForm moved to a client component at ./PasscodeForm to support inline error handling and logged-out submissions.