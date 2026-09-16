import { useCallback, useEffect, useState } from "react";
import { fetchBooks, uploadBook as uploadBookApi, deleteBook as deleteBookApi } from "../api/client.js";

export function useBooks() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const list = await fetchBooks();
      setBooks(list);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upload = useCallback(async (file, title) => {
    const book = await uploadBookApi(file, title);
    setBooks((prev) => [book, ...prev.filter((b) => b.id !== book.id)]);
    return book;
  }, []);

  const remove = useCallback(async (id) => {
    await deleteBookApi(id);
    setBooks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const patch = useCallback((id, fields) => {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, ...fields } : b)));
  }, []);

  return { books, loading, error, refresh, upload, remove, patch };
}
