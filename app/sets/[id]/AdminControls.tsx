"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminControls({ id, initial }: { id: string; initial: { is_published: boolean; passcode_required: boolean; passcode_expires_at: string | null; type: 'flashcards' | 'quiz'; options?: { reveal?: 'immediate' | 'deferred'; public_editable?: boolean } } }) {
  const [isPublished, setIsPublished] = useState(initial.is_published);
  const [pcRequired, setPcRequired] = useState(initial.passcode_required);
  const [expiresAt, setExpiresAt] = useState<string | null>(initial.passcode_expires_at);
  const [type, setType] = useState<'flashcards'|'quiz'>(initial.type);
  const [revealMode, setRevealMode] = useState<'immediate'|'deferred'>(initial.options?.reveal || 'immediate');
  const [publicEditable, setPublicEditable] = useState<boolean>(!!initial.options?.public_editable);
  const [passcode, setPasscode] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Sync local state when server-provided initial values change
  useEffect(() => {
    setIsPublished(initial.is_published);
    setPcRequired(initial.passcode_required);
    setExpiresAt(initial.passcode_expires_at);
    setType(initial.type);
    setRevealMode(initial.options?.reveal || 'immediate');
    setPublicEditable(!!initial.options?.public_editable);
    // do not reset status/passcode on revalidation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.is_published, initial.passcode_required, initial.passcode_expires_at, initial.type, initial.options?.reveal, initial.options?.public_editable]);

  async function togglePublish() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/sets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !isPublished })
      });
      if (!res.ok) throw new Error(await res.text());
      setIsPublished(!isPublished);
      setStatus(isPublished ? 'Unpublished' : 'Published');
      router.refresh();
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateType() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/sets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus('Type updated');
      router.refresh();
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveRevealMode() {
    setLoading(true);
    setStatus(null);
    try {
      const mergedOptions = { ...(initial.options || {}), reveal: revealMode };
      const res = await fetch(`/api/sets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options: mergedOptions })
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus('Reveal mode saved');
      router.refresh();
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function savePublicEditable() {
    setLoading(true);
    setStatus(null);
    try {
      const mergedOptions = { ...(initial.options || {}), public_editable: publicEditable };
      const res = await fetch(`/api/sets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options: mergedOptions })
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus('Public editing setting saved');
      router.refresh();
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function setPass() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/sets/${id}/passcode/manage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode, required: pcRequired, expiresAt })
      });
      if (!res.ok) throw new Error(await res.text());
      setPcRequired(pcRequired);
      setExpiresAt(expiresAt);
      setStatus('Passcode set');
      setPasscode('');
      router.refresh();
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function clearPass() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/sets/${id}/passcode/manage`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(await res.text());
      setPcRequired(false);
      setExpiresAt(null);
      setStatus('Passcode cleared');
      router.refresh();
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-md bg-surface2 p-4 space-y-3">
      <h3 className="font-semibold">Admin Controls</h3>
      <div className="flex items-center gap-2">
        <button className="rounded-md bg-accent px-3 py-2 text-white" onClick={togglePublish} disabled={loading}>
          {isPublished ? 'Unpublish' : 'Publish'}
        </button>
        <span className="text-sm text-muted">Status: {isPublished ? 'Published' : 'Draft'}</span>
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Type</label>
        <div className="flex items-center gap-2">
          <select className="rounded-md bg-surface p-2" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="flashcards">Flashcards</option>
            <option value="quiz">Quiz</option>
          </select>
          <button className="rounded-md bg-surface2 px-3 py-2" onClick={updateType} disabled={loading}>Update</button>
        </div>
        <p className="text-xs text-muted">Switching type changes the editor mode for this set.</p>
      </div>
      {type === 'quiz' && (
        <div className="space-y-2">
          <label className="block text-sm">Reveal Mode</label>
          <div className="flex items-center gap-2">
            <select className="rounded-md bg-surface p-2" value={revealMode} onChange={(e) => setRevealMode(e.target.value as any)}>
              <option value="immediate">Immediate (show after each question)</option>
              <option value="deferred">Deferred (show at the end)</option>
            </select>
            <button className="rounded-md bg-surface2 px-3 py-2" onClick={saveRevealMode} disabled={loading}>Save</button>
          </div>
          <p className="text-xs text-muted">Deferred mode hides correctness until submission.</p>
        </div>
      )}
      <div className="space-y-2">
        <label className="block text-sm">Public Editing</label>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={publicEditable} onChange={(e) => setPublicEditable(e.target.checked)} />
            Allow anyone to edit this set
          </label>
          <button className="rounded-md bg-surface2 px-3 py-2" onClick={savePublicEditable} disabled={loading}>Save</button>
        </div>
        <p className="text-xs text-muted">If enabled, the editor is visible to all visitors.</p>
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Passcode</label>
        <input className="w-full rounded-md bg-surface p-2" type="text" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Enter new passcode" />
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={pcRequired} onChange={(e) => setPcRequired(e.target.checked)} />
          Require passcode
        </label>
        <label className="block text-sm">Expires At (ISO string, optional)</label>
        <input className="w-full rounded-md bg-surface p-2" type="text" value={expiresAt || ''} onChange={(e) => setExpiresAt(e.target.value || null)} placeholder="e.g., 2025-12-31T23:59:59Z" />
        <div className="flex gap-2">
          <button className="rounded-md bg-accent px-3 py-2 text-white" onClick={setPass} disabled={loading || !passcode}>Set passcode</button>
          <button className="rounded-md bg-red-600 px-3 py-2 text-white" onClick={clearPass} disabled={loading}>Clear passcode</button>
        </div>
        <p className="text-sm text-muted">Current: {pcRequired ? 'Required' : 'Not required'} {expiresAt ? `• Expires: ${expiresAt}` : ''}</p>
      </div>
      {status && <p className="text-sm">{status}</p>}
    </section>
  );
}