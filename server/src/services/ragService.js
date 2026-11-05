import fs from "node:fs/promises";
import crypto from "node:crypto";
import pdfParse from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { config } from "../config.js";
import { bookStore } from "../store/bookStore.js";
import { embeddings } from "./embeddingService.js";
import { deleteBookVectors, replaceBookChunks, searchBook } from "./vectorStore.js";

const NOT_FOUND = "I could not find this information in this book.";
const answerPrompt = ChatPromptTemplate.fromMessages([
  ["system", `You answer questions strictly using the provided excerpts from a book.
Mention page numbers naturally when using an excerpt. Do not use outside knowledge.
If the excerpts do not contain the answer, reply exactly: "${NOT_FOUND}"`],
  ["human", "--- Context ---\n{context}\n--- End Context ---\n\nQuestion: {question}"],
]);
const rewritePrompt = ChatPromptTemplate.fromMessages([
  ["system", "Rewrite the latest message as a standalone question. Output only the rewritten question."],
  ["human", "Conversation:\n{history}\n\nLatest message: {question}"],
]);

function model(name, temperature, maxTokens) {
  if (!config.groqApiKey) throw new Error("GROQ_API_KEY is not configured.");
  return new ChatGroq({ apiKey: config.groqApiKey, model: name, temperature, maxTokens });
}

async function loadBook(filePath) {
  const buffer = await fs.readFile(filePath);
  const parsed = await pdfParse(buffer, {
    pagerender: async (pageData) => {
      const content = await pageData.getTextContent({ normalizeWhitespace: true });
      return content.items.map((item) => item.str).join(" ");
    },
  });
  const pages = parsed.text
    .split("\f")
    .map((pageContent, index) => ({
      pageContent: pageContent.trim(),
      metadata: { page: index + 1 },
    }))
    .filter((page) => page.pageContent);
  const totalChars = pages.reduce((sum, page) => sum + page.pageContent.trim().length, 0);
  if (totalChars / Math.max(pages.length, 1) < 40) {
    throw new Error("NO_TEXT_FOUND: this PDF appears to be scanned images.");
  }
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: config.chunkSize, chunkOverlap: config.chunkOverlap,
    separators: ["\n\n", ". ", "! ", "? ", " "],
  });
  const chunks = [];
  for (const page of pages) {
    const pageNumber = Number(page.metadata?.page || 1);
    for (const chunk of await splitter.splitDocuments([page])) {
      chunk.metadata.pageStart = pageNumber;
      chunk.metadata.pageEnd = pageNumber;
      chunks.push(chunk);
    }
  }
  return { pages: pages.length, chunks };
}

export function fileHash(filePath) {
  return fs.readFile(filePath).then((data) => crypto.createHash("sha256").update(data).digest("hex"));
}

export async function ingestBook(bookId, filePath) {
  try {
    await bookStore.update(bookId, { status: "processing", progress: 0.05 });
    const hash = await fileHash(filePath);
    const duplicate = await bookStore.findByHash(hash);
    if (duplicate && duplicate.id !== bookId) {
      await bookStore.remove(bookId);
      return { duplicate: true, book: duplicate };
    }
    const loaded = await loadBook(filePath);
    await bookStore.update(bookId, { progress: 0.35, pages: loaded.pages });
    const vectors = await embeddings.embedDocuments(loaded.chunks.map((chunk) => chunk.pageContent));
    await bookStore.update(bookId, { progress: 0.75 });
    await replaceBookChunks(bookId, loaded.chunks, vectors);
    const book = await bookStore.update(bookId, {
      fileHash: hash, status: "ready", progress: 1, chunks: loaded.chunks.length, error: null,
    });
    return { duplicate: false, book };
  } catch (error) {
    await bookStore.update(bookId, {
      status: "failed",
      error: error.message.startsWith("NO_TEXT_FOUND") ? error.message : `INGEST_ERROR: ${error.message}`,
    });
    throw error;
  }
}

function contextBlock(sources) {
  return sources.map((source) => {
    const label = source.page_start === source.page_end
      ? `[Page ${source.page_start}]` : `[Pages ${source.page_start}-${source.page_end}]`;
    return `${label} ${source.snippet}`;
  }).join("\n\n");
}

export async function answerQuestion(bookId, question, history = []) {
  const start = Date.now();
  let standalone = question;
  if (history.length) {
    standalone = await rewritePrompt
      .pipe(model(config.groqRewriteModel, 0, 100))
      .pipe(new StringOutputParser())
      .invoke({ history: history.slice(-4).map((h) => `${h.role}: ${h.content}`).join("\n"), question });
  }
  const rows = await searchBook(bookId, await embeddings.embedQuery(standalone.trim()), config.topK);
  const sources = rows.map((row) => ({
    page_start: row.page_start, page_end: row.page_end, section: row.section,
    score: Number(Number(row.score).toFixed(4)),
    snippet: row.content.length <= 400 ? row.content : `${row.content.slice(0, 400).replace(/\s+\S*$/, "")}...`,
  })).filter((source) => source.score >= config.minSimilarity);
  if (!sources.length) {
    return { answer: NOT_FOUND, sources: [], grounded: false, latency_ms: Date.now() - start };
  }
  const answer = await answerPrompt
    .pipe(model(config.groqModel, 0.1, 800))
    .pipe(new StringOutputParser())
    .invoke({ question: standalone.trim(), context: contextBlock(sources) });
  return { answer: answer.trim(), sources, grounded: true, latency_ms: Date.now() - start };
}

export { deleteBookVectors };
