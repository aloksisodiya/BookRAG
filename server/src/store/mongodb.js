import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

let client;
let database;
let collection;
let initialization;

export async function getBooksCollection() {
  if (collection) return collection;
  if (!config.mongodbUri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  initialization ??= initialize();
  await initialization;
  return collection;
}

async function initialize() {
  client = new MongoClient(config.mongodbUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  database = client.db(config.mongodbDbName);
  collection = database.collection(config.mongodbCollection);
  logger.info(
    `MongoDB connected: database=${config.mongodbDbName}, collection=${config.mongodbCollection}`,
  );
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ fileHash: 1 }, { unique: true, sparse: true });
  await migrateLegacyBooks();
}

async function migrateLegacyBooks() {
  const currentFile = fileURLToPath(import.meta.url);
  const legacyFile = path.join(
    path.dirname(currentFile),
    "..",
    "..",
    "books.json",
  );
  if (!fs.existsSync(legacyFile)) return;

  let legacyBooks;
  try {
    legacyBooks = JSON.parse(fs.readFileSync(legacyFile, "utf-8"));
  } catch (err) {
    throw new Error(`Unable to read legacy books.json: ${err.message}`);
  }

  for (const book of Object.values(legacyBooks)) {
    if (!book?.id) continue;
    await collection.updateOne(
      { id: book.id },
      { $setOnInsert: { ...book, _id: book.id } },
      { upsert: true },
    );
  }
}

export async function closeMongoDB() {
  if (client) await client.close();
}
