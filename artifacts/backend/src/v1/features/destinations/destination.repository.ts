import { PhaseDestinationModel } from "@workspace/db/src/schema/phase1";

export const destinationRepository = {
  list(filters: Record<string, unknown>, skip: number, limit: number) {
    return PhaseDestinationModel.find(filters).sort({ rating: -1, name: 1 }).skip(skip).limit(limit);
  },
  count(filters: Record<string, unknown>) {
    return PhaseDestinationModel.countDocuments(filters);
  },
  create(payload: Record<string, unknown>) {
    return PhaseDestinationModel.create(payload);
  },
  findBySlug(slug: string) {
    return PhaseDestinationModel.findOne({ slug });
  },
  findNearby(id: string, state: string, region: string) {
    return PhaseDestinationModel.find({ _id: { $ne: id }, $or: [{ state }, { region }] }).limit(6).sort({ rating: -1 });
  },
  update(id: string, payload: Record<string, unknown>) {
    return PhaseDestinationModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  },
  remove(id: string) {
    return PhaseDestinationModel.findByIdAndDelete(id);
  },
};
