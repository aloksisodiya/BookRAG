import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 4000),
  ragServiceUrl: process.env.RAG_SERVICE_URL || "http://127.0.0.1:8000",
  internalApiKey:
    process.env.INTERNAL_API_KEY || "change-me-to-a-long-random-string",
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 50),
  uploadDir: process.env.UPLOAD_DIR || "../data/books",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  mongodbUri: process.env.MONGODB_URI || "",
  mongodbDbName: process.env.MONGODB_DB_NAME || "book_rag_assistant",
  mongodbCollection: process.env.MONGODB_COLLECTION || "books",
};
