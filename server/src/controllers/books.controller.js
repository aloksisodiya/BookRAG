import fs from "node:fs";
import { nanoid } from "nanoid";
import { bookStore } from "../store/bookStore.js";
import { ingestBook, getIngestStatus, deleteBookVectors } from "../services/ragClient.js";
import { Errors } from "../utils/errors.js";

export async function uploadBook(req, res, next) {
  try {
    if (!req.file) return next(Errors.invalidFile());

    const bookId = `book_${nanoid(10)}`;
    const title = req.body.title?.trim() || req.file.originalname.replace(/\.pdf$/i, "");

    bookStore.create({
      id: bookId,
      title,
      status: "queued",
      progress: 0,
      pages: null,
      chunks: null,
      error: null,
      createdAt: new Date().toISOString(),
      filePath: req.file.path,
    });

    const fileStream = fs.createReadStream(req.file.path);
    const result = await ingestBook(bookId, fileStream, req.file.originalname);

    if (result.job_id === "duplicate") {
      // The Python service recognized this exact file already exists under
      // another book_id — link to it instead of double-storing vectors.
      bookStore.remove(bookId);
      const existing = bookStore.get(result.book_id);
      return res.status(200).json({ book: existing || { id: result.book_id, status: "ready" }, duplicate: true });
    }

    bookStore.update(bookId, { status: "processing" });
    res.status(202).json({ book: bookStore.get(bookId) });
  } catch (err) {
    next(err);
  }
}

export async function listBooks(req, res) {
  res.json({ books: bookStore.list() });
}

export async function getBookStatus(req, res, next) {
  try {
    const book = bookStore.get(req.params.id);
    if (!book) return next(Errors.bookNotFound());

    const status = await getIngestStatus(req.params.id);
    bookStore.update(req.params.id, {
      status: status.status,
      progress: status.progress,
      pages: status.pages,
      chunks: status.chunks,
      error: status.error,
    });
    res.json({ book: bookStore.get(req.params.id) });
  } catch (err) {
    next(err);
  }
}

export async function deleteBook(req, res, next) {
  try {
    const book = bookStore.get(req.params.id);
    if (!book) return next(Errors.bookNotFound());

    await deleteBookVectors(req.params.id);
    if (book.filePath && fs.existsSync(book.filePath)) {
      fs.unlinkSync(book.filePath);
    }
    bookStore.remove(req.params.id);
    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    next(err);
  }
}
