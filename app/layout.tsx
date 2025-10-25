import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FQuiz — Flashcards & Quizzes',
  description: 'Mobile-first flashcards and multiple-choice quizzes',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-text">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold">FQuiz</h1>
            <p className="text-sm text-muted">Flashcards & Quizzes</p>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}