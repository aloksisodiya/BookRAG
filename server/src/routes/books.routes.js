import { Router } from "express";
import { uploadPdf } from "../middleware/upload.middleware.js";
import { uploadBook, listBooks, getBookStatus, deleteBook } from "../controllers/books.controller.js";

export const booksRouter = Router();

booksRouter.post("/upload", uploadPdf.single("file"), uploadBook);
booksRouter.get("/", listBooks);
booksRouter.get("/:id/status", getBookStatus);
booksRouter.delete("/:id", deleteBook);
