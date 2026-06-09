import { InquiryModel, UserAccountModel, NotificationModel } from "@workspace/db";
import { emitToUser } from "../../integrations/realtime.service";
import { sendEmail } from "../../integrations/mail.service";
import { AppError } from "../../shared/errors";
import { buildAdminEnquiryEmail, buildUserEnquiryEmail } from "../../../lib/notifications";

export const inquiryService = {
  async create(input: { name: string; phone: string; email: string; destination: string; travelDates: string; message: string; userId?: string }) {
    const item = await InquiryModel.create(input);
    const submittedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

    // Notify admins
    try {
      const admins = await UserAccountModel.find({ role: "admin" }, "_id email").lean();
      const adminEmail = buildAdminEnquiryEmail({
        name: input.name,
        email: input.email,
        phone: input.phone,
        destination: input.destination,
        travelDate: input.travelDates,
        message: input.message,
        submittedAt,
      });
      for (const admin of admins) {
        const adminId = admin._id.toString();
        await NotificationModel.create({
          userId: admin._id,
          title: "New Inquiry Received",
          message: `${input.name} has submitted a new inquiry for ${input.destination}.`,
          type: "system",
        });
        emitToUser(adminId, "notification", { message: "New Inquiry Received" });
        await sendEmail({
          to: admin.email,
          subject: "New enquiry received - Journey Junction",
          html: adminEmail.html ?? adminEmail.text,
          text: adminEmail.text,
        });
      }
    } catch (err) {
      console.error("Failed to notify admins", err);
    }

    try {
      const userEmail = buildUserEnquiryEmail({
        name: input.name,
        email: input.email,
        phone: input.phone,
        destination: input.destination,
        travelDate: input.travelDates,
        message: input.message,
        submittedAt,
      });
      await sendEmail({
        to: input.email,
        subject: "We received your enquiry - Journey Junction",
        html: userEmail.html ?? userEmail.text,
        text: userEmail.text,
      });
    } catch (err) {
      console.error("Failed to send inquiry confirmation email", err);
    }

    return { inquiry: item };
  },

  async list() {
    const inquiries = await InquiryModel.find().sort({ createdAt: -1 }).lean();
    const inquiryIds = inquiries.map((i: any) => i._id);
    
    const notifications = await NotificationModel.find({
      relatedEntityType: "inquiry",
      relatedEntityId: { $in: inquiryIds }
    }).lean();
    
    const notifMap = new Map(notifications.map(n => [n.relatedEntityId?.toString(), n]));

    return inquiries.map((i: any) => {
      const notification = notifMap.get(i._id.toString());
      return { 
        ...i, 
        id: i._id.toString(),
        notificationDelivered: !!notification,
        notificationRead: notification?.isRead || false,
        notificationEmailSent: notification?.emailSent || false,
      };
    });
  },

  async reply(id: string, replyMessage: string) {
    const inquiry = await InquiryModel.findById(id);
    if (!inquiry) throw new AppError(404, "Inquiry not found");

    inquiry.status = "Replied";
    inquiry.replyMessage = replyMessage;
    inquiry.repliedAt = new Date();
    await inquiry.save();

    // Notify the user who created it
    let emailSent = false;
    try {
      await sendEmail({
        to: inquiry.email,
        subject: "Reply to your inquiry on Wandr",
        html: `<p>Hi ${inquiry.name},</p><p>An expert has replied to your inquiry regarding ${inquiry.destination}:</p><blockquote>${replyMessage}</blockquote>`,
      });
      emailSent = true;
    } catch (err) {
      console.error("Failed to send reply email", err);
    }

    if (inquiry.userId) {
      try {
        const userIdStr = inquiry.userId.toString();
        const notification = await NotificationModel.create({
          userId: inquiry.userId,
          title: "Inquiry Reply",
          message: `An expert has replied to your inquiry for ${inquiry.destination}.`,
          type: "admin_reply",
          emailSent,
          link: `/notifications`,
          relatedEntityId: inquiry._id,
          relatedEntityType: "inquiry"
        });
        
        emitToUser(userIdStr, "notification", { ...notification.toJSON(), id: notification._id.toString() });
      } catch (err) {
        console.error("Failed to create notification", err);
      }
    }

    return { inquiry: { ...inquiry.toJSON(), id: inquiry._id.toString() } };
  },

  async delete(id: string) {
    const inquiry = await InquiryModel.findByIdAndDelete(id);
    if (!inquiry) throw new AppError(404, "Inquiry not found");
    return { ok: true };
  },

  async getById(id: string, userId: string) {
    const inquiry = await InquiryModel.findOne({ _id: id, userId });
    if (!inquiry) throw new AppError(404, "Inquiry not found");
    return { inquiry: { ...inquiry.toJSON(), id: inquiry._id.toString() } };
  }
};
