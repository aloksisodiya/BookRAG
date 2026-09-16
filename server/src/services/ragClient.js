/**
 * Thin HTTP client for the internal Python RAG service.
 * Centralizes the base URL, internal API key header, and timeout so every
 * call site doesn't repeat that config.
 */
import axios from "axios";
import { config } from "../config.js";

export const ragClient = axios.create({
  baseURL: config.ragServiceUrl,
  timeout: 30_000, // ingestion returns immediately; queries can take a few seconds for Groq
  headers: { "X-Internal-Api-Key": config.internalApiKey },
});

export async function ingestBook(bookId, fileStream, filename) {
  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("file", fileStream, filename);
  const { data } = await ragClient.post(`/rag/ingest`, form, {
    params: { book_id: bookId },
    headers: { ...form.getHeaders(), "X-Internal-Api-Key": config.internalApiKey },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  return data;
}

export async function getIngestStatus(bookId) {
  const { data } = await ragClient.get(`/rag/status/${bookId}`);
  return data;
}

export async function queryBook(bookId, question, history) {
  const { data } = await ragClient.post(`/rag/query`, {
    book_id: bookId,
    question,
    history,
  }, { timeout: 25_000 });
  return data;
}

export async function deleteBookVectors(bookId) {
  const { data } = await ragClient.delete(`/rag/books/${bookId}`);
  return data;
}

export async function ragHealth() {
  const { data } = await ragClient.get(`/health`, { timeout: 3_000 });
  return data;
}
