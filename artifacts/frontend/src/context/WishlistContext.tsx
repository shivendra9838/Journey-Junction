import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import type { ActivityItem, HotelItem } from "@/data/destinations";
import { apiFetch } from "@/lib/api";
import { useUser } from "@/context/UserContext";

export interface WishlistedDestination {
  id: string; name: string; state: string; heroImage: string; rating: number; region: string; tagline: string;
}

export interface WishlistedActivity {
  destId: string; destName: string;
  title: string; category: string; duration: string; price: string; image: string;
}

export interface WishlistedHotel {
  destId: string; destName: string;
  name: string; stars: number; price: string; image: string; tag: string;
}

interface WishlistState {
  destinations: WishlistedDestination[];
  activities:   WishlistedActivity[];
  hotels:       WishlistedHotel[];
}

interface WishlistCtx extends WishlistState {
  totalCount: number;
  syncing: boolean;
  isDestSaved:     (id: string) => boolean;
  isActivitySaved: (destId: string, title: string) => boolean;
  isHotelSaved:    (destId: string, name: string) => boolean;
  toggleDestination: (dest: WishlistedDestination) => Promise<void>;
  toggleActivity:    (destId: string, destName: string, act: ActivityItem) => Promise<void>;
  toggleHotel:       (destId: string, destName: string, hotel: HotelItem) => Promise<void>;
  clearAll: () => Promise<void>;
}

const LOCAL_KEY = "wandr_wishlist_v1";
const EMPTY: WishlistState = { destinations: [], activities: [], hotels: [] };

function loadLocal(): WishlistState {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as WishlistState) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function saveLocal(s: WishlistState) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

type ApiWishlistResponse = {
  destinations: Array<{ destId: string; name: string; state: string; heroImage: string; rating: number; region: string; tagline: string }>;
  activities:   Array<{ destId: string; destName: string; title: string; category: string; duration: string; price: string; image: string }>;
  hotels:       Array<{ destId: string; destName: string; name: string; stars: number; price: string; image: string; tag: string }>;
};

function mapApiToState(data: ApiWishlistResponse): WishlistState {
  return {
    destinations: data.destinations.map(r => ({
      id: r.destId, name: r.name, state: r.state,
      heroImage: r.heroImage, rating: r.rating, region: r.region, tagline: r.tagline,
    })),
    activities: data.activities.map(r => ({
      destId: r.destId, destName: r.destName,
      title: r.title, category: r.category, duration: r.duration, price: r.price, image: r.image,
    })),
    hotels: data.hotels.map(r => ({
      destId: r.destId, destName: r.destName,
      name: r.name, stars: r.stars, price: r.price, image: r.image, tag: r.tag,
    })),
  };
}

const WishlistContext = createContext<WishlistCtx>(null!);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useUser();
  const [state, setState] = useState<WishlistState>(EMPTY);
  const [syncing, setSyncing] = useState(false);
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      if (prevUserId.current === user.id) return;
      prevUserId.current = user.id;
      setSyncing(true);
      apiFetch<ApiWishlistResponse>("/wishlist")
        .then(data => setState(mapApiToState(data)))
        .catch(() => setState(EMPTY))
        .finally(() => setSyncing(false));
    } else {
      prevUserId.current = null;
      const local = loadLocal();
      setState(local);
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!user && !authLoading) saveLocal(state);
  }, [state, user, authLoading]);

  const isDestSaved = useCallback((id: string) =>
    state.destinations.some(d => d.id === id), [state.destinations]);

  const isActivitySaved = useCallback((destId: string, title: string) =>
    state.activities.some(a => a.destId === destId && a.title === title), [state.activities]);

  const isHotelSaved = useCallback((destId: string, name: string) =>
    state.hotels.some(h => h.destId === destId && h.name === name), [state.hotels]);

  const toggleDestination = useCallback(async (dest: WishlistedDestination) => {
    const saved = state.destinations.some(d => d.id === dest.id);
    if (user) {
      if (saved) {
        await apiFetch(`/wishlist/destinations/${dest.id}`, { method: "DELETE" });
        setState(s => ({ ...s, destinations: s.destinations.filter(d => d.id !== dest.id) }));
      } else {
        await apiFetch("/wishlist/destinations", {
          method: "POST",
          body: JSON.stringify({
            destId: dest.id, name: dest.name, state: dest.state,
            heroImage: dest.heroImage, rating: dest.rating, region: dest.region, tagline: dest.tagline,
          }),
        });
        setState(s => ({ ...s, destinations: [...s.destinations, dest] }));
      }
    } else {
      setState(s => ({
        ...s,
        destinations: saved
          ? s.destinations.filter(d => d.id !== dest.id)
          : [...s.destinations, dest],
      }));
    }
  }, [user, state.destinations]);

  const toggleActivity = useCallback(async (destId: string, destName: string, act: ActivityItem) => {
    const saved = state.activities.some(a => a.destId === destId && a.title === act.title);
    if (user) {
      if (saved) {
        await apiFetch(`/wishlist/activities/${destId}/${encodeURIComponent(act.title)}`, { method: "DELETE" });
        setState(s => ({ ...s, activities: s.activities.filter(a => !(a.destId === destId && a.title === act.title)) }));
      } else {
        await apiFetch("/wishlist/activities", {
          method: "POST",
          body: JSON.stringify({ destId, destName, title: act.title, category: act.category, duration: act.duration, price: act.price, image: act.image }),
        });
        setState(s => ({ ...s, activities: [...s.activities, { destId, destName, title: act.title, category: act.category, duration: act.duration, price: act.price, image: act.image }] }));
      }
    } else {
      setState(s => ({
        ...s,
        activities: saved
          ? s.activities.filter(a => !(a.destId === destId && a.title === act.title))
          : [...s.activities, { destId, destName, title: act.title, category: act.category, duration: act.duration, price: act.price, image: act.image }],
      }));
    }
  }, [user, state.activities]);

  const toggleHotel = useCallback(async (destId: string, destName: string, hotel: HotelItem) => {
    const saved = state.hotels.some(h => h.destId === destId && h.name === hotel.name);
    if (user) {
      if (saved) {
        await apiFetch(`/wishlist/hotels/${destId}/${encodeURIComponent(hotel.name)}`, { method: "DELETE" });
        setState(s => ({ ...s, hotels: s.hotels.filter(h => !(h.destId === destId && h.name === hotel.name)) }));
      } else {
        await apiFetch("/wishlist/hotels", {
          method: "POST",
          body: JSON.stringify({ destId, destName, name: hotel.name, stars: hotel.stars, price: hotel.price, image: hotel.image, tag: hotel.tag }),
        });
        setState(s => ({ ...s, hotels: [...s.hotels, { destId, destName, name: hotel.name, stars: hotel.stars, price: hotel.price, image: hotel.image, tag: hotel.tag }] }));
      }
    } else {
      setState(s => ({
        ...s,
        hotels: saved
          ? s.hotels.filter(h => !(h.destId === destId && h.name === hotel.name))
          : [...s.hotels, { destId, destName, name: hotel.name, stars: hotel.stars, price: hotel.price, image: hotel.image, tag: hotel.tag }],
      }));
    }
  }, [user, state.hotels]);

  const clearAll = useCallback(async () => {
    if (user) {
      await apiFetch("/wishlist", { method: "DELETE" });
    }
    setState(EMPTY);
  }, [user]);

  const totalCount = state.destinations.length + state.activities.length + state.hotels.length;

  return (
    <WishlistContext.Provider value={{
      ...state, totalCount, syncing,
      isDestSaved, isActivitySaved, isHotelSaved,
      toggleDestination, toggleActivity, toggleHotel,
      clearAll,
    }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
