import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../shared/errors";
import { validate } from "../../shared/validate";
import { supportService } from "./support.service";

const router = Router();

router.post(
  "/chat",
  validate("body", z.object({
    message: z.string().min(1),
    history: z.array(z.object({
      role: z.enum(["user", "bot"]),
      text: z.string()
    })).default([])
  })),
  asyncHandler(async (req, res) => {
    const { message, history } = req.body;
    const response = await supportService.chat(message, history);
    res.json({ reply: response });
  })
);

export default router;
