'use client';
import { useEffect, useRef, useState } from 'react';

export default function MusicToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enabled, setEnabled] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('fquiz:music');
      if (raw) setEnabled(raw === 'on');
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('fquiz:music', enabled ? 'on' : 'off'); } catch {}
    const audio = audioRef.current;
    if (!audio) return;
    if (enabled) {
      audio.loop = true;
      audio.volume = 0.15;
      audio.play()
        .then(() => setError(null))
        .catch((e) => setError(e?.message || 'Autoplay blocked. Click to play.'));
    } else {
      audio.pause();
    }
  }, [enabled]);

  return (
    <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-md bg-surface2 px-3 py-2 shadow">
      <audio
        ref={audioRef}
        preload="auto"
        onError={(e) => {
          const media = e.currentTarget;
          const code = media?.error?.code;
          const msg = code === 1 ? 'MEDIA_ERR_ABORTED' : code === 2 ? 'MEDIA_ERR_NETWORK' : code === 3 ? 'MEDIA_ERR_DECODE' : code === 4 ? 'MEDIA_ERR_SRC_NOT_SUPPORTED' : 'Audio error';
          setError(`Audio: ${msg}`);
        }}
        onCanPlayThrough={() => setError(null)}
      >
        <source src="/audio/Game%20On!.mp3" type="audio/mpeg" />
      </audio>
      <button
        className="rounded-md bg-accent px-2 py-1 text-white text-sm"
        onClick={() => setEnabled((v) => !v)}
        aria-pressed={enabled}
        aria-label={enabled ? 'Turn music off' : 'Turn music on'}
        title={enabled ? 'Turn music off' : 'Turn music on'}
      >
        {enabled ? 'Music: On' : 'Music: Off'}
      </button>
      {error ? <span className="text-xs text-muted">{error}</span> : null}
    </div>
  );
}