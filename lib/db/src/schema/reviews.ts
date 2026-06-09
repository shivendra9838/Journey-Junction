import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userAvatar: { type: String, default: null },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const reviewSchema = new mongoose.Schema(
  {
    userId:       { type: String, required: true, index: true },
    destId:       { type: String, required: true, index: true },
    authorName:   { type: String, required: true },
    authorAvatar: { type: String, default: null },
    tripType:     { type: String, required: true },
    rating:       { type: Number, required: true, min: 1, max: 5 },
    title:        { type: String, required: true },
    review:       { type: String, required: true },
    photos:       [{ type: String }],
    helpful:      { type: Number, default: 0 },
    // Social & Moderation Fields
    status:       { type: String, enum: ["pending", "approved", "rejected"], default: "approved" },
    isFeatured:   { type: Boolean, default: false },
    likes:        [{ type: String }], // Array of user IDs
    saves:        [{ type: String }], // Array of user IDs
    comments:     [commentSchema],
  },
  { timestamps: true },
);

reviewSchema.index({ createdAt: -1 });

reviewSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret["id"] = (ret["_id"] as { toString(): string }).toString();
    delete ret["_id"];
    delete ret["__v"];
    return ret;
  },
});

export const ReviewModel = mongoose.model("Review", reviewSchema);
