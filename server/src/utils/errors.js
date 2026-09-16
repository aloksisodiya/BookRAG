/** A known, user-facing application error. Anything else is treated as an
 * unexpected 500 by the error-handling middleware. */
export class AppError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const Errors = {
  invalidFile: () => new AppError("INVALID_FILE", "Unable to process this file. Please upload a valid PDF.", 400),
  fileTooLarge: (maxMb) => new AppError("FILE_TOO_LARGE", `This file exceeds the ${maxMb} MB limit.`, 413),
  noTextFound: () => new AppError("NO_TEXT_FOUND", "No readable text was found in this document — it may be a scanned image PDF.", 422),
  bookNotFound: () => new AppError("BOOK_NOT_FOUND", "This book does not exist.", 404),
  bookNotReady: () => new AppError("BOOK_NOT_READY", "This book is still being processed.", 409),
  ragUnavailable: () => new AppError("RAG_UNAVAILABLE", "RAG service is currently unavailable. Please try again.", 502),
  llmUnavailable: () => new AppError("LLM_UNAVAILABLE", "Unable to generate an answer right now. Please try again.", 502),
  validation: (message) => new AppError("VALIDATION_ERROR", message, 400),
};
