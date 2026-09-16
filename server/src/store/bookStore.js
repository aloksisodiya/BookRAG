/**
 * Application-level book registry.
 *
 * This is an in-memory store for the MVP, persisted to a JSON file on disk
 * so a restart doesn't lose the list of known books (their vectors are
 * still safe in ChromaDB regardless). Swap for a real database (Postgres/
 * SQLite) once multi-user auth is added — this store has no concurrency
 * control beyond a single Node process.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, "..", "..", "books.json");

function load() {
  if (!fs.existsSync(DB_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function persist(books) {
  fs.writeFileSync(DB_FILE, JSON.stringify(books, null, 2));
}

let books = load();

export const bookStore = {
  create(book) {
    books[book.id] = book;
    persist(books);
    return book;
  },
  get(id) {
    return books[id] || null;
  },
  list() {
    return Object.values(books).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  update(id, fields) {
    if (!books[id]) return null;
    books[id] = { ...books[id], ...fields };
    persist(books);
    return books[id];
  },
  remove(id) {
    const existed = Boolean(books[id]);
    delete books[id];
    persist(books);
    return existed;
  },
  findByHash(hash) {
    return Object.values(books).find((b) => b.fileHash === hash) || null;
  },
};
