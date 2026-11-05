import { bookStore } from "../store/bookStore.js";
import { answerQuestion } from "../services/ragService.js";
import { Errors } from "../utils/errors.js";

export async function askQuestion(req, res, next) {
  try {
    const { bookId, question, history } = req.body;

    const book = await bookStore.get(bookId);
    if (!book) return next(Errors.bookNotFound());
    if (book.status !== "ready") return next(Errors.bookNotReady());

    const result = await answerQuestion(bookId, question, history);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
