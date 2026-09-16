import { StatusBadge } from "./StatusBadge.jsx";

export function BookListItem({ book, active, onSelect, onDelete }) {
  const meta = book.status === "ready"
    ? `${book.pages ?? "?"} pages · ${book.chunks ?? "?"} chunks`
    : book.status === "processing"
      ? `${Math.round((book.progress || 0) * 100)}%`
      : book.status === "failed"
        ? "Could not be processed"
        : "Waiting to start";

  return (
    <div
      className={`book-item ${active ? "active" : ""}`}
      onClick={() => onSelect(book)}
      role="button"
      tabIndex={0}
    >
      <div className="book-spine" />
      <div className="book-item-body">
        <div className="book-item-title">{book.title}</div>
        <div className="book-item-meta">
          <StatusBadge status={book.status} /> · {meta}
        </div>
      </div>
      <button
        className="book-delete"
        title="Delete book"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(book.id);
        }}
      >
        ×
      </button>
    </div>
  );
}
