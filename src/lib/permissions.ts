import { supabaseServer } from './supabaseClient';
import { getServerSession } from 'next-auth';
import { authOptions } from './authOptions';
import { cookies } from 'next/headers';

/**
 * Check if the current user can edit a set
 * Returns true if:
 * - User is the owner of the set, OR
 * - Set has public_editable enabled
 */
export async function canEditSet(setId: string): Promise<{
  canEdit: boolean;
  isOwner: boolean;
  publicEditable: boolean;
  userEmail: string | null;
}> {
  const supabase = supabaseServer();

  // Get the set
  const { data: set, error: setError } = await supabase
    .from('sets')
    .select('id, created_by, options')
    .eq('id', setId)
    .single();

  if (setError || !set) {
    return { canEdit: false, isOwner: false, publicEditable: false, userEmail: null };
  }

  // Check if public editing is enabled
  const publicEditable = !!(set.options && set.options.public_editable);

  // Get current user (NextAuth session or guest email)
  const session = await getServerSession(authOptions);
  const guestEmailCookie = cookies().get('guest_email');
  const userEmail = session?.user?.email || guestEmailCookie?.value || null;

  if (!userEmail) {
    // No user logged in - can only edit if public_editable
    return { canEdit: publicEditable, isOwner: false, publicEditable, userEmail: null };
  }

  // Check if user is the owner
  let isOwner = false;
  if (set.created_by) {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    isOwner = !!(user && user.id === set.created_by);
  }

  // Can edit if owner OR public_editable
  const canEdit = isOwner || publicEditable;

  return { canEdit, isOwner, publicEditable, userEmail };
}
