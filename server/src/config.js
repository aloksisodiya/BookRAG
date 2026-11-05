import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 4000),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 50),
  uploadDir: process.env.UPLOAD_DIR || "../data/books",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  postgresUrl:
    process.env.DATABASE_URL || "postgres://bookrag:bookrag@127.0.0.1:5432/bookrag",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
  groqRewriteModel: process.env.GROQ_REWRITE_MODEL || "openai/gpt-oss-20b",
  embeddingModel: process.env.EMBEDDING_MODEL || "Xenova/bge-small-en-v1.5",
  embeddingDtype: process.env.EMBEDDING_DTYPE || "q8",
  embeddingBatchSize: Number(process.env.EMBEDDING_BATCH_SIZE || 8),
  chunkSize: Number(process.env.CHUNK_SIZE || 1000),
  chunkOverlap: Number(process.env.CHUNK_OVERLAP || 150),
  topK: Number(process.env.TOP_K || 5),
  minSimilarity: Number(process.env.MIN_SIMILARITY || 0.35),
};
