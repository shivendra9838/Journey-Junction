import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth";
import { notificationService } from "./notification.service";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const notifications = await notificationService.list(req.session!.userId!);
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
});

router.get("/unread-count", async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.session!.userId!);
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/read", async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.session!.userId!, req.params.id);
    res.json({ notification });
  } catch (err) {
    next(err);
  }
});

router.patch("/read-all", async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.session!.userId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await notificationService.delete(req.session!.userId!, req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
