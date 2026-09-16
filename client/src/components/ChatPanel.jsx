import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble.jsx";
import { useChat } from "../hooks/useChat.js";

export function ChatPanel({ book }) {
  const { messages, pending, send, reset } = useChat(book?.status === "ready" ? book.id : null);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);
  const prevBookId = useRef(book?.id);

  useEffect(() => {
    if (prevBookId.current !== book?.id) {
      reset();
      prevBookId.current = book?.id;
    }
  }, [book?.id, reset]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  if (!book) {
    return (
      <div className="empty-state">
        <h2>Select a book to start asking questions</h2>
        <p>Upload a PDF from the shelf on the left, or pick one already there.</p>
      </div>
    );
  }

  if (book.status !== "ready") {
    return (
      <div className="empty-state">
        <h2>{book.title}</h2>
        <p>
          {book.status === "failed"
            ? book.error || "This book could not be processed."
            : "This book is still being processed — it'll be ready to ask questions shortly."}
        </p>
      </div>
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || pending) return;
    send(input.trim());
    setInput("");
  }

  return (
    <>
      <div className="chat-scroll" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="empty-state" style={{ padding: "20px 0" }}>
            <h2>Ask about "{book.title}"</h2>
            <p>Answers are grounded in this book's contents, with page references.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {pending && <div className="typing-indicator">Thinking through the book...</div>}
      </div>

      <form className="composer" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Ask a question about this book..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={pending}
        />
        <button type="submit" disabled={pending || !input.trim()}>
          Ask
        </button>
      </form>
    </>
  );
}
