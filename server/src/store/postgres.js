import pg from "pg";
import { config } from "../config.js";

const { Pool } = pg;
export const pool = new Pool({ connectionString: config.postgresUrl });

export async function initializeDatabase() {
  await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, status TEXT NOT NULL,
      progress REAL NOT NULL DEFAULT 0, pages INTEGER, chunks INTEGER,
      error TEXT, created_at TIMESTAMPTZ NOT NULL, file_path TEXT NOT NULL,
      file_hash TEXT UNIQUE
    );
    CREATE TABLE IF NOT EXISTS book_chunks (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      content TEXT NOT NULL, page_start INTEGER NOT NULL, page_end INTEGER NOT NULL,
      section TEXT, embedding vector(384) NOT NULL
    );
    CREATE INDEX IF NOT EXISTS book_chunks_book_id_idx ON book_chunks(book_id);
  `);
}

export async function closeDatabase() {
  await pool.end();
}
