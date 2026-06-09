import { Router, type IRouter } from "express";
import { isDBConnected, NotificationModel } from "@workspace/db";
import { requireAuth } from "../middleware/requireAuth";

const router: IRouter = Router();

function toPublicDoc(doc: any) {
  const json = typeof doc.toJSON === "function" ? doc.toJSON() : doc;
  return {
    id: json.id ?? json._id?.toString?.(),
    title: json.title,
    message: json.message,
    type: json.type,
    isRead: Boolean(json.isRead),
    createdAt: json.createdAt,
    link: json.link,
    relatedEntityId: json.relatedEntityId?.toString?.() ?? json.relatedEntityId,
    relatedEntityType: json.relatedEntityType,
  };
}

router.get("/notifications", requireAuth, async (req, res) => {
  if (!isDBConnected()) {
    res.json({ notifications: [], unreadCount: 0 });
    return;
  }
  const userId = req.session.userId;
  const [notifications, unreadCount] = await Promise.all([
    NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(30),
    NotificationModel.countDocuments({ userId, isRead: false }),
  ]);
  res.json({ notifications: notifications.map(toPublicDoc), unreadCount });
});

router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  if (!isDBConnected()) {
    res.json({ ok: true });
    return;
  }
  const doc = await NotificationModel.findOneAndUpdate(
    { _id: req.params.id, userId: req.session.userId },
    { $set: { isRead: true } },
    { returnDocument: "after" },
  );
  if (!doc) {
    res.status(404).json({ error: "Notification not found." });
    return;
  }
  res.json({ notification: toPublicDoc(doc) });
});

router.post("/notifications/read-all", requireAuth, async (req, res) => {
  if (isDBConnected()) {
    await NotificationModel.updateMany({ userId: req.session.userId, isRead: false }, { $set: { isRead: true } });
  }
  res.json({ ok: true });
});

router.delete("/notifications/:id", requireAuth, async (req, res) => {
  if (!isDBConnected()) {
    res.json({ ok: true });
    return;
  }
  const doc = await NotificationModel.findOneAndDelete({ _id: req.params.id, userId: req.session.userId });
  if (!doc) {
    res.status(404).json({ error: "Notification not found." });
    return;
  }
  res.json({ ok: true });
});

export default router;

