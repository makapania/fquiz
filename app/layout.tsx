import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">FQuiz</h1>
                <p className="text-sm text-muted">Flashcards & Quizzes</p>
              </div>
              <nav className="text-sm">
                <Link href="/" className="mr-4 text-accent">Home</Link>
                <Link href="/sets" className="text-accent">Sets</Link>
              </nav>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}