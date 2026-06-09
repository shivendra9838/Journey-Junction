import { AppError } from "../../shared/errors";
import { activityRepository } from "./activity.repository";

type ActivityInput = {
  title: string;
  destinationId: string;
  description: string;
  duration?: string;
  difficulty?: "easy" | "moderate" | "hard";
  images?: string[];
  price: number;
};

export const activityService = {
  async list(query: Record<string, unknown>) {
    const filters: Record<string, unknown> = {};
    if (query.q) filters.$text = { $search: String(query.q) };
    if (query.destinationId) filters.destinationId = query.destinationId;
    if (query.difficulty) filters.difficulty = query.difficulty;
    if (query.maxPrice) filters.price = { $lte: Number(query.maxPrice) };
    return { items: await activityRepository.list(filters) };
  },
  async create(input: ActivityInput) {
    return { activity: await activityRepository.create(input) };
  },
  async get(id: string) {
    const activity = await activityRepository.findById(id);
    if (!activity) throw new AppError(404, "Activity not found");
    return { activity };
  },
  async update(id: string, input: Partial<ActivityInput>) {
    const activity = await activityRepository.update(id, input);
    if (!activity) throw new AppError(404, "Activity not found");
    return { activity };
  },
  async remove(id: string) {
    const activity = await activityRepository.remove(id);
    if (!activity) throw new AppError(404, "Activity not found");
    return { success: true };
  },
};
