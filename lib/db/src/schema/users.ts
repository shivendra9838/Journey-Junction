import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true },
    email:        { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    avatar:       { type: String, default: null },
  },
  { timestamps: true },
);

userSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret["id"] = (ret["_id"] as { toString(): string }).toString();
    delete ret["_id"];
    delete ret["__v"];
    delete ret["passwordHash"];
    return ret;
  },
});

export const UserModel = mongoose.model("User", userSchema);
