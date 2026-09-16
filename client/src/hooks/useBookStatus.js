import { useEffect, useRef } from "react";
import { fetchBookStatus } from "../api/client.js";

/** Polls a book's ingestion status every 2s until it reaches ready/failed. */
export function useBookStatus(book, onUpdate) {
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!book || book.status === "ready" || book.status === "failed") {
      return undefined;
    }

    intervalRef.current = setInterval(async () => {
      try {
        const updated = await fetchBookStatus(book.id);
        onUpdate(book.id, updated);
        if (updated.status === "ready" || updated.status === "failed") {
          clearInterval(intervalRef.current);
        }
      } catch {
        // Transient poll failures are ignored; the next tick tries again.
      }
    }, 2000);

    return () => clearInterval(intervalRef.current);
  }, [book?.id, book?.status, onUpdate]);
}

/**
 * Polls every book still in "queued"/"processing" on a single shared
 * interval, so sidebar badges update even for books the user isn't
 * currently viewing. Kept separate from useBookStatus (which is fine to
 * call once, for the single active book) to avoid calling a hook a
 * variable number of times per render, which would break the Rules of
 * Hooks as the book list grows or shrinks.
 */
export function usePendingBooksPoll(books, onUpdate) {
  const booksRef = useRef(books);
  booksRef.current = books;

  useEffect(() => {
    const interval = setInterval(async () => {
      const pending = booksRef.current.filter(
        (b) => b.status === "queued" || b.status === "processing"
      );
      for (const book of pending) {
        try {
          const updated = await fetchBookStatus(book.id);
          onUpdate(book.id, updated);
        } catch {
          // Transient poll failures are ignored; the next tick tries again.
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [onUpdate]);
}
