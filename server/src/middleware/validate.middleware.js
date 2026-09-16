import { Errors } from "../utils/errors.js";

export function validateChatBody(req, res, next) {
  const { bookId, question } = req.body || {};
  if (!bookId || typeof bookId !== "string") {
    return next(Errors.validation("bookId is required."));
  }
  if (!question || typeof question !== "string" || !question.trim()) {
    return next(Errors.validation("question is required."));
  }
  if (question.length > 2000) {
    return next(Errors.validation("question is too long (max 2000 characters)."));
  }
  const history = Array.isArray(req.body.history) ? req.body.history.slice(-10) : [];
  req.body.history = history;
  next();
}
