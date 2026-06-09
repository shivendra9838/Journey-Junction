import { ActivityModel } from "@workspace/db/src/schema/phase1";

export const activityRepository = {
  list(filters: Record<string, unknown>) {
    return ActivityModel.find(filters).sort({ price: 1, title: 1 }).limit(100);
  },
  byDestination(destinationId: string, limit = 10) {
    return ActivityModel.find({ destinationId }).limit(limit).sort({ price: 1, title: 1 });
  },
  create(payload: Record<string, unknown>) {
    return ActivityModel.create(payload);
  },
  findById(id: string) {
    return ActivityModel.findById(id);
  },
  update(id: string, payload: Record<string, unknown>) {
    return ActivityModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  },
  remove(id: string) {
    return ActivityModel.findByIdAndDelete(id);
  },
};
