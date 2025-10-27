"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

type Card = {
  id: string;
  prompt: string;
  answer: string;
  explanation?: string | null;
};

type FlashcardSet = {
  id: string;
  title: string;
  description?: string;
};

type CardStatus = 'unseen' | 'know' | 'dont-know';

export default function StudyFlashcardsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [flashcardSet, setFlashcardSet] = useState<FlashcardSet | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [viewMode, setViewMode] = useState<'one-by-one' | 'grid'>('one-by-one');
  const [cardStatuses, setCardStatuses] = useState<Map<string, CardStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentCard = cards[currentIndex];

  useEffect(() => {
    loadFlashcards();
  }, [id]);

  async function loadFlashcards() {
    setLoading(true);
    setError(null);
    try {
      // Load flashcard set
      const setRes = await fetch(`/api/sets/${id}`);
      if (!setRes.ok) throw new Error('Flashcard set not found');
      const setData = await setRes.json();
      setFlashcardSet(setData);

      // Load cards
      const cardsRes = await fetch(`/api/sets/${id}/cards`);
      if (!cardsRes.ok) {
        if (cardsRes.status === 403) {
          router.push(`/sets/${id}`);
          return;
        }
        throw new Error('Failed to load flashcards');
      }
      const cardsData = await cardsRes.json();

      if (!cardsData.items || cardsData.items.length === 0) {
        throw new Error('This flashcard set has no cards yet');
      }

      setCards(cardsData.items);

      // Initialize card statuses
      const statusMap = new Map<string, CardStatus>();
      cardsData.items.forEach((card: Card) => {
        statusMap.set(card.id, 'unseen');
      });
      setCardStatuses(statusMap);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function flipCard() {
    setIsFlipped(!isFlipped);
  }

  function markCard(status: 'know' | 'dont-know') {
    if (!currentCard) return;

    // Update status
    const newStatuses = new Map(cardStatuses);
    newStatuses.set(currentCard.id, status);
    setCardStatuses(newStatuses);

    // Move to next card
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  }

  function goToCard(index: number) {
    setCurrentIndex(index);
    setIsFlipped(false);
    setViewMode('one-by-one');
  }

  function resetProgress() {
    const newStatuses = new Map<string, CardStatus>();
    cards.forEach(card => {
      newStatuses.set(card.id, 'unseen');
    });
    setCardStatuses(newStatuses);
    setCurrentIndex(0);
    setIsFlipped(false);
  }

  const knowCount = Array.from(cardStatuses.values()).filter(s => s === 'know').length;
  const dontKnowCount = Array.from(cardStatuses.values()).filter(s => s === 'dont-know').length;
  const unseenCount = Array.from(cardStatuses.values()).filter(s => s === 'unseen').length;
  const progress = cards.length > 0 ? Math.round(((knowCount + dontKnowCount) / cards.length) * 100) : 0;

  if (loading) {
    return (
      <main className="space-y-4">
        <p className="text-muted">Loading flashcards...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="space-y-4">
        <div className="rounded-lg bg-surface p-4">
          <h2 className="text-xl font-semibold text-red-400">Error</h2>
          <p className="text-muted">{error}</p>
          <button
            onClick={() => router.push(`/sets/${id}`)}
            className="mt-4 rounded-md bg-accent px-4 py-2 text-white"
          >
            Back to Set
          </button>
        </div>
      </main>
    );
  }

  if (viewMode === 'grid') {
    return (
      <main className="space-y-4">
        {/* Header */}
        <div className="rounded-lg bg-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{flashcardSet?.title}</h2>
              <p className="text-sm text-muted">{cards.length} cards</p>
            </div>
            <button
              onClick={() => setViewMode('one-by-one')}
              className="rounded-md bg-accent px-4 py-2 text-white"
            >
              Study Mode
            </button>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-green-900/30 p-4">
            <p className="text-sm text-muted">Know</p>
            <p className="text-3xl font-bold text-green-400">{knowCount}</p>
          </div>
          <div className="rounded-lg bg-red-900/30 p-4">
            <p className="text-sm text-muted">Don't Know</p>
            <p className="text-3xl font-bold text-red-400">{dontKnowCount}</p>
          </div>
          <div className="rounded-lg bg-surface2 p-4">
            <p className="text-sm text-muted">Not Reviewed</p>
            <p className="text-3xl font-bold">{unseenCount}</p>
          </div>
        </div>

        {/* Grid of Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => {
            const status = cardStatuses.get(card.id) || 'unseen';
            let borderClass = 'border-2 border-gray-600';
            if (status === 'know') borderClass = 'border-2 border-green-500';
            if (status === 'dont-know') borderClass = 'border-2 border-red-500';

            return (
              <button
                key={card.id}
                onClick={() => goToCard(index)}
                className={`rounded-lg bg-white p-4 text-left transition-all hover:shadow-lg ${borderClass}`}
              >
                <p className="font-medium text-gray-900">{card.prompt}</p>
                <p className="mt-2 text-sm text-gray-600">{card.answer}</p>
                {card.explanation && (
                  <p className="mt-2 text-xs text-gray-500">{card.explanation}</p>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/sets/${id}`)}
            className="rounded-md bg-surface2 px-4 py-2 text-text"
          >
            Back to Set
          </button>
          <button
            onClick={resetProgress}
            className="rounded-md bg-surface2 px-4 py-2 text-text"
          >
            Reset Progress
          </button>
        </div>
      </main>
    );
  }

  // One-by-one study mode
  return (
    <main className="space-y-4">
      {/* Header */}
      <div className="rounded-lg bg-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{flashcardSet?.title}</h2>
            <p className="text-sm text-muted">
              Card {currentIndex + 1} of {cards.length} • {progress}% reviewed
            </p>
          </div>
          <button
            onClick={() => setViewMode('grid')}
            className="rounded-md bg-surface2 px-4 py-2 text-text"
          >
            Grid View
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="rounded-lg bg-surface p-4">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-green-400">Know: {knowCount}</span>
          <span className="text-red-400">Don't Know: {dontKnowCount}</span>
          <span className="text-muted">Unseen: {unseenCount}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      {currentCard && (
        <div className="flex justify-center">
          <div
            onClick={flipCard}
            className="group relative h-80 w-full max-w-2xl cursor-pointer"
            style={{ perspective: '1000px' }}
          >
            <div
              className={`relative h-full w-full transition-transform duration-500`}
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Front of card (prompt) */}
              <div
                className="absolute flex h-full w-full flex-col items-center justify-center rounded-lg bg-white p-8 text-center shadow-lg"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                <p className="text-3xl font-semibold text-gray-900">{currentCard.prompt}</p>
                <p className="mt-4 text-sm text-gray-500">Click to flip</p>
              </div>

              {/* Back of card (answer) */}
              <div
                className="absolute flex h-full w-full flex-col items-center justify-center rounded-lg bg-gray-50 p-8 text-center shadow-lg"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <p className="text-2xl font-semibold text-gray-900">{currentCard.answer}</p>
                {currentCard.explanation && (
                  <p className="mt-4 text-sm text-gray-600">{currentCard.explanation}</p>
                )}
                <p className="mt-4 text-sm text-gray-500">Click to flip back</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {currentCard && isFlipped && (
        <div className="flex justify-center gap-4">
          <button
            onClick={() => markCard('dont-know')}
            className="rounded-md bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700"
          >
            Don't Know
          </button>
          <button
            onClick={() => markCard('know')}
            className="rounded-md bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700"
          >
            I Know This
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => router.push(`/sets/${id}`)}
          className="rounded-md bg-surface2 px-4 py-2 text-text"
        >
          Exit Study
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => {
              if (currentIndex > 0) {
                setCurrentIndex(currentIndex - 1);
                setIsFlipped(false);
              }
            }}
            disabled={currentIndex === 0}
            className={`rounded-md px-4 py-2 ${
              currentIndex === 0
                ? 'cursor-not-allowed bg-surface2 text-muted'
                : 'bg-surface2 text-text hover:bg-surface2/80'
            }`}
          >
            Previous
          </button>
          <button
            onClick={() => {
              if (currentIndex < cards.length - 1) {
                setCurrentIndex(currentIndex + 1);
                setIsFlipped(false);
              }
            }}
            disabled={currentIndex === cards.length - 1}
            className={`rounded-md px-4 py-2 ${
              currentIndex === cards.length - 1
                ? 'cursor-not-allowed bg-surface2 text-muted'
                : 'bg-surface2 text-text hover:bg-surface2/80'
            }`}
          >
            Next
          </button>
        </div>
      </div>

      {currentIndex === cards.length - 1 && knowCount + dontKnowCount === cards.length && (
        <div className="rounded-lg bg-accent/20 p-6 text-center">
          <h3 className="text-xl font-semibold">Study Session Complete!</h3>
          <p className="mt-2 text-muted">
            You reviewed all {cards.length} cards. Great work!
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Image src="/funkyhom.png" alt="Funkyhom" width={56} height={56} className="rounded" />
            <p className="text-xl font-semibold">
              {dontKnowCount > 0 ? 'suboptimal' : 'to school for cool'}
            </p>
          </div>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={resetProgress}
              className="rounded-md bg-accent px-6 py-2 text-white"
            >
              Study Again
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className="rounded-md bg-surface2 px-6 py-2 text-text"
            >
              Review Grid
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
