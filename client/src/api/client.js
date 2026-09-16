import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

export const api = axios.create({ baseURL, timeout: 30_000 });

export function apiErrorMessage(err) {
  return err?.response?.data?.error?.message || err.message || "Something went wrong.";
}

export async function fetchBooks() {
  const { data } = await api.get("/books");
  return data.books;
}

export async function uploadBook(file, title) {
  const form = new FormData();
  form.append("file", file);
  if (title) form.append("title", title);
  const { data } = await api.post("/books/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.book;
}

export async function fetchBookStatus(id) {
  const { data } = await api.get(`/books/${id}/status`);
  return data.book;
}

export async function deleteBook(id) {
  await api.delete(`/books/${id}`);
}

export async function askQuestion(bookId, question, history) {
  const { data } = await api.post("/chat", { bookId, question, history });
  return data;
}
