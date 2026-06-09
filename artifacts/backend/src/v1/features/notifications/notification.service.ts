import { NotificationModel } from "@workspace/db/src/schema/phase2";
import { AppError } from "../../shared/errors";

export const notificationService = {
  async list(userId: string) {
    const notifications = await NotificationModel.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    return notifications.map(n => ({ ...n, id: n._id.toString() }));
  },

  async getUnreadCount(userId: string) {
    return NotificationModel.countDocuments({ userId, isRead: false });
  },

  async markAsRead(userId: string, notificationId: string) {
    const notification = await NotificationModel.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { isRead: true } },
      { returnDocument: "after" }
    ).lean();
    
    if (!notification) {
      throw new AppError(404, "Notification not found");
    }
    
    return { ...notification, id: notification._id.toString() };
  },

  async markAllAsRead(userId: string) {
    await NotificationModel.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    );
    return { success: true };
  },

  async delete(userId: string, notificationId: string) {
    const notification = await NotificationModel.findOneAndDelete({
      _id: notificationId,
      userId,
    });
    
    if (!notification) {
      throw new AppError(404, "Notification not found");
    }
    
    return { success: true };
  }
};
