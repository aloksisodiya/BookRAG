import { pool } from "./postgres.js";

function mapBook(row) {
  if (!row) return null;
  return {
    id: row.id, title: row.title, status: row.status, progress: row.progress,
    pages: row.pages, chunks: row.chunks, error: row.error,
    createdAt: row.created_at.toISOString(), filePath: row.file_path,
  };
}

export const bookStore = {
  async create(book) {
    const { rows } = await pool.query(
      `INSERT INTO books
       (id,title,status,progress,pages,chunks,error,created_at,file_path)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [book.id, book.title, book.status, book.progress, book.pages, book.chunks,
        book.error, book.createdAt, book.filePath],
    );
    return mapBook(rows[0]);
  },
  async get(id) {
    const { rows } = await pool.query("SELECT * FROM books WHERE id = $1", [id]);
    return mapBook(rows[0]);
  },
  async list() {
    const { rows } = await pool.query("SELECT * FROM books ORDER BY created_at DESC");
    return rows.map(mapBook);
  },
  async update(id, fields) {
    const columns = { status: "status", progress: "progress", pages: "pages",
      chunks: "chunks", error: "error", fileHash: "file_hash" };
    const entries = Object.entries(fields).filter(([key]) => columns[key]);
    if (!entries.length) return this.get(id);
    const values = [id];
    const assignments = entries.map(([key], index) => {
      values.push(fields[key]);
      return `${columns[key]} = $${index + 2}`;
    });
    const { rows } = await pool.query(
      `UPDATE books SET ${assignments.join(", ")} WHERE id = $1 RETURNING *`, values,
    );
    return mapBook(rows[0]);
  },
  async remove(id) {
    const result = await pool.query("DELETE FROM books WHERE id = $1", [id]);
    return result.rowCount > 0;
  },
  async findByHash(hash) {
    const { rows } = await pool.query("SELECT * FROM books WHERE file_hash = $1", [hash]);
    return mapBook(rows[0]);
  },
};
