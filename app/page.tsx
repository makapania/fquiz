export default function HomePage() {
  return (
    <main className="space-y-6">
      <section className="rounded-lg bg-surface p-4">
        <h2 className="text-xl font-medium">Welcome</h2>
        <p className="text-muted">Study flashcards or take quizzes. Sign in or join as a guest.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-cardSurface p-4 text-cardText">
          <h3 className="text-lg font-semibold">Flashcards</h3>
          <p>White/off-white surface for readability. Tap to flip.</p>
        </div>
        <div className="rounded-lg bg-surface2 p-4">
          <h3 className="text-lg font-semibold">Quizzes</h3>
          <p className="text-muted">Multiple-choice with 4 or 5 options, instant or deferred reveal.</p>
        </div>
      </section>

      <section className="rounded-lg bg-surface p-4">
        <button className="rounded-md bg-accent px-4 py-2 text-white">Get Started</button>
      </section>
    </main>
  );
}