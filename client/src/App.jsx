import { useCallback, useState } from "react";
import { Sidebar } from "./components/Sidebar.jsx";
import { ChatPanel } from "./components/ChatPanel.jsx";
import { useBooks } from "./hooks/useBooks.js";
import { usePendingBooksPoll } from "./hooks/useBookStatus.js";

export default function App() {
  const { books, upload, remove, patch } = useBooks();
  const [activeId, setActiveId] = useState(null);

  const activeBook = books.find((b) => b.id === activeId) || null;

  const handleStatusUpdate = useCallback((id, fields) => patch(id, fields), [patch]);
  // Polls every book still processing on one shared interval — including
  // the active one — so both the sidebar badges and the open chat panel
  // stay in sync without calling a hook a variable number of times.
  usePendingBooksPoll(books, handleStatusUpdate);

  async function handleUpload(file, title) {
    const book = await upload(file, title);
    setActiveId(book.id);
    return book;
  }

  async function handleDelete(id) {
    await remove(id);
    if (activeId === id) setActiveId(null);
  }

  return (
    <div className="app-shell">
      <Sidebar
        books={books}
        activeId={activeId}
        onSelect={(b) => setActiveId(b.id)}
        onDelete={handleDelete}
        onUpload={handleUpload}
      />
      <div className="page">
        {activeBook && (
          <div className="page-header">
            <h2 className="page-title">{activeBook.title}</h2>
            <p className="page-subtitle">Ask questions grounded in this book, with page-level sources.</p>
          </div>
        )}
        <ChatPanel book={activeBook} />
      </div>
    </div>
  );
}
