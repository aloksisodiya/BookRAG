import { Router } from "express";
import { validateChatBody } from "../middleware/validate.middleware.js";
import { askQuestion } from "../controllers/chat.controller.js";

export const chatRouter = Router();

chatRouter.post("/", validateChatBody, askQuestion);
