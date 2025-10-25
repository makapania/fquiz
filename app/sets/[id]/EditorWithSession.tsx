"use client";
import ContentEditor from './ContentEditor';

export default function EditorWithSession({ id, type }: { id: string; type: 'flashcards' | 'quiz' }) {
  return <ContentEditor id={id} type={type} />;
}