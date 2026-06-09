import { PhaseWishlistModel } from "@workspace/db/src/schema/phase1";

export const wishlistRepository = {
  list(userId: string) {
    return PhaseWishlistModel.find({ userId }).populate("destinationId").sort({ createdAt: -1 });
  },
  add(userId: string, destinationId: string) {
    return PhaseWishlistModel.findOneAndUpdate(
      { userId, destinationId },
      { userId, destinationId },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  },
  remove(userId: string, destinationId: string) {
    return PhaseWishlistModel.deleteOne({ userId, destinationId });
  },
};
