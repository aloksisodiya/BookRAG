import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { booksRouter } from "./routes/books.routes.js";
import { chatRouter } from "./routes/chat.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.middleware.js";

export const app = express();

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: "1mb" }));

app.use("/api/books", booksRouter);
app.use("/api/chat", chatRouter);
app.use("/health", healthRouter);

app.use(notFoundHandler);
app.use(errorHandler);
