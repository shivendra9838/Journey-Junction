import { HotelModel } from "@workspace/db/src/schema/phase1";

export const hotelRepository = {
  list(filters: Record<string, unknown>, skip: number, limit: number) {
    return HotelModel.find(filters).sort({ rating: -1, pricePerNight: 1 }).skip(skip).limit(limit);
  },
  count(filters: Record<string, unknown>) {
    return HotelModel.countDocuments(filters);
  },
  byDestination(destinationId: string, limit = 10) {
    return HotelModel.find({ destinationId }).limit(limit).sort({ rating: -1, pricePerNight: 1 });
  },
  create(payload: Record<string, unknown>) {
    return HotelModel.create(payload);
  },
  findById(id: string) {
    return HotelModel.findById(id);
  },
  update(id: string, payload: Record<string, unknown>) {
    return HotelModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  },
  remove(id: string) {
    return HotelModel.findByIdAndDelete(id);
  },
};
