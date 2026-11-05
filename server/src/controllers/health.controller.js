import { pool } from "../store/postgres.js";
import { config } from "../config.js";

export async function health(req, res) {
  let postgresStatus = "unreachable";
  try {
    await pool.query("SELECT 1");
    postgresStatus = "ok";
  } catch {
    postgresStatus = "unreachable";
  }

  res.json({
    status: "ok",
    node: "ok",
    postgres: postgresStatus,
    embeddingModel: config.embeddingModel,
    timestamp: new Date().toISOString(),
  });
}
