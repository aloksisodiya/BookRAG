import multer from "multer";
import { AppError, Errors } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { config } from "../config.js";

/** Every error response uses one envelope shape: { error: { code, message } }. */
export function errorHandler(err, req, res, _next) {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    err = Errors.fileTooLarge(config.maxUploadMb);
  }

  if (err instanceof AppError) {
    return res
      .status(err.statusCode)
      .json({ error: { code: err.code, message: err.message } });
  }

  // Map known upstream RAG-service failures embedded in error messages/details.
  const upstreamDetail = err?.response?.data?.detail;
  if (typeof upstreamDetail === "string") {
    if (upstreamDetail.startsWith("NO_TEXT_FOUND")) {
      return res
        .status(422)
        .json({
          error: {
            code: "NO_TEXT_FOUND",
            message:
              "No readable text was found — this PDF appears to be scanned images.",
          },
        });
    }
    if (upstreamDetail.startsWith("BOOK_NOT_READY")) {
      return res
        .status(409)
        .json({
          error: {
            code: "BOOK_NOT_READY",
            message: "This book is still being processed.",
          },
        });
    }
    if (upstreamDetail.startsWith("LLM_UNAVAILABLE")) {
      return res
        .status(502)
        .json({
          error: {
            code: "LLM_UNAVAILABLE",
            message:
              "Unable to generate an answer right now. Please try again.",
          },
        });
    }
    if (
      upstreamDetail.includes("internal API key") ||
      upstreamDetail.includes("Invalid or missing internal API key")
    ) {
      return res
        .status(401)
        .json({
          error: {
            code: "RAG_AUTH_ERROR",
            message:
              "RAG service authentication failed. Ensure the internal API key in server/.env matches rag-service/.env.",
          },
        });
    }
  }

  if (err.response?.status === 401) {
    return res
      .status(401)
      .json({
        error: {
          code: "RAG_AUTH_ERROR",
          message:
            "RAG service authentication failed. Ensure the internal API key in server/.env matches rag-service/.env.",
        },
      });
  }

  if (
    err.code === "ECONNREFUSED" ||
    err.code === "ECONNABORTED" ||
    err.code === "ETIMEDOUT"
  ) {
    return res
      .status(502)
      .json({
        error: {
          code: "RAG_UNAVAILABLE",
          message: "RAG service is currently unavailable. Please try again.",
        },
      });
  }

  logger.error("Unhandled error:", err);
  return res
    .status(500)
    .json({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong." },
    });
}

export function notFoundHandler(req, res) {
  res
    .status(404)
    .json({ error: { code: "NOT_FOUND", message: "Route not found." } });
}
