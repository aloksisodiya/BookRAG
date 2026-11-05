import { Embeddings } from "@langchain/core/embeddings";
import { pipeline } from "@huggingface/transformers";
import { config } from "../config.js";

let extractorPromise;
const queryPrefix = "Represent this sentence for searching relevant passages: ";

class LocalEmbeddings extends Embeddings {
  constructor() {
    super({});
  }

  async getExtractor() {
    extractorPromise = extractorPromise || pipeline(
      "feature-extraction",
      config.embeddingModel,
      { dtype: config.embeddingDtype },
    );
    return extractorPromise;
  }

  async embedDocuments(texts) {
    const extractor = await this.getExtractor();
    const output = await extractor(texts, {
      pooling: "mean",
      normalize: true,
      batch_size: config.embeddingBatchSize,
    });
    return output.tolist();
  }

  async embedQuery(text) {
    const [embedding] = await this.embedDocuments([queryPrefix + text]);
    return embedding;
  }
}

export const embeddings = new LocalEmbeddings();
