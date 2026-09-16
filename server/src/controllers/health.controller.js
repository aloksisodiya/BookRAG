import { ragHealth } from "../services/ragClient.js";

export async function health(req, res) {
  let ragStatus = "unreachable";
  let ragDetails = null;
  try {
    ragDetails = await ragHealth();
    ragStatus = "ok";
  } catch {
    ragStatus = "unreachable";
  }

  res.json({
    status: "ok",
    node: "ok",
    ragService: ragStatus,
    ragDetails,
    timestamp: new Date().toISOString(),
  });
}
