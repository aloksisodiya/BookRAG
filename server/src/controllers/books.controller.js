import fs from "node:fs";
import { nanoid } from "nanoid";
import { bookStore } from "../store/bookStore.js";
import { fileHash, ingestBook, deleteBookVectors } from "../services/ragService.js";
import { Errors } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export async function uploadBook(req, res, next) {
  try {
    if (!req.file) return next(Errors.invalidFile());

    const bookId = `book_${nanoid(10)}`;
    const title =
      req.body.title?.trim() || req.file.originalname.replace(/\.pdf$/i, "");
    const hash = await fileHash(req.file.path);
    const existing = await bookStore.findByHash(hash);
    if (existing) {
      fs.unlinkSync(req.file.path);
      return res.status(200).json({ book: existing, duplicate: true });
    }

    await bookStore.create({
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

    ingestBook(bookId, req.file.path)
      .catch((error) => logger.error(`Ingestion failed for ${bookId}:`, error));
    res.status(202).json({ book: await bookStore.get(bookId) });
  } catch (err) {
    next(err);
  }
}

export async function listBooks(req, res, next) {
  try {
    res.json({ books: await bookStore.list() });
  } catch (err) {
    next(err);
  }
}

export async function getBookStatus(req, res, next) {
  try {
    const book = await bookStore.get(req.params.id);
    if (!book) return next(Errors.bookNotFound());

    res.json({ book: await bookStore.get(req.params.id) });
  } catch (err) {
    next(err);
  }
}

export async function deleteBook(req, res, next) {
  try {
    const book = await bookStore.get(req.params.id);
    if (!book) return next(Errors.bookNotFound());

    await deleteBookVectors(req.params.id);
    if (book.filePath && fs.existsSync(book.filePath)) {
      fs.unlinkSync(book.filePath);
    }
    await bookStore.remove(req.params.id);
    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    next(err);
  }
}
