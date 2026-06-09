export interface LocalUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  passwordHash: string;
  createdAt: string;
}

export interface LocalWishlistDestination {
  userId: string;
  destId: string;
  name: string;
  state: string;
  heroImage: string;
  rating: number;
  region: string;
  tagline: string;
}

export interface LocalWishlistActivity {
  userId: string;
  destId: string;
  destName: string;
  title: string;
  category: string;
  duration: string;
  price: string;
  image: string;
}

export interface LocalWishlistHotel {
  userId: string;
  destId: string;
  destName: string;
  name: string;
  stars: number;
  price: string;
  image: string;
  tag: string;
}

export interface LocalWishlist {
  destinations: LocalWishlistDestination[];
  activities: LocalWishlistActivity[];
  hotels: LocalWishlistHotel[];
}

export interface LocalReview {
  id: string;
  userId: string;
  destId: string;
  authorName: string;
  authorAvatar: string | null;
  tripType: "Couple" | "Solo" | "Family" | "Business" | "Friends";
  rating: number;
  title: string;
  review: string;
  helpful: number;
  createdAt: string;
}

export interface LocalCustomDestination {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  stateSlug: string;
  country: string;
  region: string;
  heroImage: string;
  images: string[];
  photos: string[];
  tagline: string;
  rating: number;
  reviewCount: number;
  climateLabel: string;
  climate: string;
  tags: string[];
  about: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export const localUsers = new Map<string, LocalUser>();
export const localWishlists = new Map<string, LocalWishlist>();
export const localReviews: LocalReview[] = [];
export const localCustomDests: LocalCustomDestination[] = [];

export function toPublicUser(user: LocalUser, isAdmin = false) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    isAdmin,
  };
}

export function localUserById(id: string | undefined) {
  if (!id) return null;
  for (const user of localUsers.values()) {
    if (user.id === id) return user;
  }
  return null;
}

export function localWishlist(userId: string): LocalWishlist {
  const existing = localWishlists.get(userId);
  if (existing) return existing;
  const created: LocalWishlist = { destinations: [], activities: [], hotels: [] };
  localWishlists.set(userId, created);
  return created;
}

export function localWishlistCount(userId: string): number {
  const wishlist = localWishlist(userId);
  return wishlist.destinations.length + wishlist.activities.length + wishlist.hotels.length;
}
