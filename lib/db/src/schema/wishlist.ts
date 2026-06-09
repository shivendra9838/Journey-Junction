import mongoose from "mongoose";

function jsonTransform(_doc: unknown, ret: Record<string, unknown>) {
  ret["id"] = (ret["_id"] as { toString(): string }).toString();
  delete ret["_id"];
  delete ret["__v"];
  return ret;
}

const wishlistDestSchema = new mongoose.Schema(
  {
    userId:    { type: String, required: true, index: true },
    destId:    { type: String, required: true },
    name:      { type: String, required: true },
    state:     { type: String, required: true },
    heroImage: { type: String, required: true },
    rating:    { type: Number, required: true },
    region:    { type: String, required: true },
    tagline:   { type: String, required: true },
  },
  { timestamps: true },
);
wishlistDestSchema.set("toJSON", { virtuals: true, transform: jsonTransform });
export const WishlistDestModel = mongoose.model("WishlistDest", wishlistDestSchema);

const wishlistActivitySchema = new mongoose.Schema(
  {
    userId:   { type: String, required: true, index: true },
    destId:   { type: String, required: true },
    destName: { type: String, required: true },
    title:    { type: String, required: true },
    category: { type: String, required: true },
    duration: { type: String, required: true },
    price:    { type: String, required: true },
    image:    { type: String, required: true },
  },
  { timestamps: true },
);
wishlistActivitySchema.set("toJSON", { virtuals: true, transform: jsonTransform });
export const WishlistActivityModel = mongoose.model("WishlistActivity", wishlistActivitySchema);

const wishlistHotelSchema = new mongoose.Schema(
  {
    userId:   { type: String, required: true, index: true },
    destId:   { type: String, required: true },
    destName: { type: String, required: true },
    name:     { type: String, required: true },
    stars:    { type: Number, required: true },
    price:    { type: String, required: true },
    image:    { type: String, required: true },
    tag:      { type: String, required: true },
  },
  { timestamps: true },
);
wishlistHotelSchema.set("toJSON", { virtuals: true, transform: jsonTransform });
export const WishlistHotelModel = mongoose.model("WishlistHotel", wishlistHotelSchema);
