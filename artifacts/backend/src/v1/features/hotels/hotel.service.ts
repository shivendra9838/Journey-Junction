import { AppError } from "../../shared/errors";
import { getPagination, paged } from "../../shared/pagination";
import { hotelRepository } from "./hotel.repository";

type HotelInput = {
  name: string;
  destinationId: string;
  description: string;
  images?: string[];
  amenities?: string[];
  rating?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  pricePerNight: number;
};

const payload = (input: Partial<HotelInput>) => {
  const next: Record<string, unknown> = { ...input };
  if (input.latitude !== undefined || input.longitude !== undefined) {
    next.location = { type: "Point" as const, coordinates: [input.longitude ?? 0, input.latitude ?? 0] };
  }
  delete next.latitude;
  delete next.longitude;
  return next;
};

export const hotelService = {
  async list(query: Record<string, unknown>) {
    const { page, limit, skip } = getPagination(query);
    const filters: Record<string, unknown> = {};
    if (query.q) filters.$text = { $search: String(query.q) };
    if (query.destinationId) filters.destinationId = query.destinationId;
    if (query.minRating) filters.rating = { $gte: Number(query.minRating) };
    if (query.maxPrice) filters.pricePerNight = { $lte: Number(query.maxPrice) };
    if (query.amenity) filters.amenities = new RegExp(String(query.amenity), "i");
    const [items, total] = await Promise.all([
      hotelRepository.list(filters, skip, limit),
      hotelRepository.count(filters),
    ]);
    return paged(items, total, page, limit);
  },
  async create(input: HotelInput) {
    return { hotel: await hotelRepository.create(payload(input)) };
  },
  async get(id: string) {
    const hotel = await hotelRepository.findById(id);
    if (!hotel) throw new AppError(404, "Hotel not found");
    return { hotel };
  },
  async update(id: string, input: Partial<HotelInput>) {
    const hotel = await hotelRepository.update(id, payload(input));
    if (!hotel) throw new AppError(404, "Hotel not found");
    return { hotel };
  },
  async remove(id: string) {
    const hotel = await hotelRepository.remove(id);
    if (!hotel) throw new AppError(404, "Hotel not found");
    return { success: true };
  },
};
