import { pool } from "../store/postgres.js";

const vectorLiteral = (vector) => `[${vector.join(",")}]`;

export async function replaceBookChunks(bookId, chunks, vectors) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM book_chunks WHERE book_id = $1", [bookId]);
    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      await client.query(
        `INSERT INTO book_chunks
         (id,book_id,content,page_start,page_end,section,embedding)
         VALUES ($1,$2,$3,$4,$5,$6,$7::vector)`,
        [`${bookId}:${String(i).padStart(5, "0")}`, bookId, chunk.pageContent,
          chunk.metadata.pageStart, chunk.metadata.pageEnd, chunk.metadata.section || null,
          vectorLiteral(vectors[i])],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function searchBook(bookId, vector, limit) {
  const { rows } = await pool.query(
    `SELECT content, page_start, page_end, section,
            1 - (embedding <=> $1::vector) AS score
     FROM book_chunks WHERE book_id = $2
     ORDER BY embedding <=> $1::vector LIMIT $3`,
    [vectorLiteral(vector), bookId, limit],
  );
  return rows;
}

export async function deleteBookVectors(bookId) {
  const result = await pool.query("DELETE FROM book_chunks WHERE book_id = $1", [bookId]);
  return result.rowCount > 0;
}
