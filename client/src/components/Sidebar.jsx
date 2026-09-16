import { BookListItem } from "./BookListItem.jsx";
import { BookUpload } from "./BookUpload.jsx";

export function Sidebar({ books, activeId, onSelect, onDelete, onUpload }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">Book RAG Assistant</h1>
        <p className="sidebar-subtitle">Your shelf</p>
      </div>

      <div className="book-list">
        {books.length === 0 && (
          <div className="empty-shelf">No books yet — upload a PDF to get started.</div>
        )}
        {books.map((book) => (
          <BookListItem
            key={book.id}
            book={book}
            active={book.id === activeId}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        ))}
      </div>

      <BookUpload onUpload={onUpload} />
    </aside>
  );
}
