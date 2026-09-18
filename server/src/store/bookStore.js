/** MongoDB-backed application-level book registry. */
import { getBooksCollection } from "./mongodb.js";

export const bookStore = {
  async create(book) {
    const collection = await getBooksCollection();
    await collection.insertOne({ ...book, _id: book.id });
    return book;
  },
  async get(id) {
    const collection = await getBooksCollection();
    const book = await collection.findOne({ id }, { projection: { _id: 0 } });
    return book || null;
  },
  async list() {
    const collection = await getBooksCollection();
    return collection
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
  },
  async update(id, fields) {
    const collection = await getBooksCollection();
    const result = await collection.findOneAndUpdate(
      { id },
      { $set: fields },
      { returnDocument: "after", projection: { _id: 0 } },
    );
    return result || null;
  },
  async remove(id) {
    const collection = await getBooksCollection();
    const result = await collection.deleteOne({ id });
    return result.deletedCount > 0;
  },
  async findByHash(hash) {
    const collection = await getBooksCollection();
    const book = await collection.findOne(
      { fileHash: hash },
      { projection: { _id: 0 } },
    );
    return book || null;
  },
};
