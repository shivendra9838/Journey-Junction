import { Router, type IRouter } from "express";
import { CustomDestModel, isDBConnected } from "@workspace/db";
import { ActivityModel, HotelModel, PhaseDestinationModel } from "@workspace/db/src/schema/phase1";
import { localCustomDests } from "../lib/localStore";
import { coordinatesForDestination } from "../lib/geo";
import { DESTINATIONS, getDestinationById, type DestinationSummary } from "../data/destinations";

const router: IRouter = Router();
const PLACEHOLDER_DESTINATION_IMAGE = "/images/unsplash-bd9404f5e774.jpg";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function genericGallery(heroImage: string) {
  return [
    heroImage,
    "/images/unsplash-451710d2942a.jpg",
    "/images/unsplash-7c5d196ce843.jpg",
    "/images/unsplash-a6836391f181.jpg",
  ].filter(Boolean);
}

function compactImage(value: string | undefined) {
  if (!value) return "";
  return value.startsWith("data:") ? PLACEHOLDER_DESTINATION_IMAGE : value;
}

function normalizeStatic(d: DestinationSummary) {
  const gallery = genericGallery(d.heroImage);
  const coordinates = coordinatesForDestination(d);
  return {
    ...d,
    id: d.id,
    dbId: d.id,
    slug: d.slug,
    city: d.city,
    stateSlug: d.stateSlug || slugify(d.state),
    images: gallery,
    photos: gallery,
    gallery,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    climate: d.climateLabel,
    reviewCount: d.reviews,
    isPublished: true,
    isCustom: false,
    highlights: [
      { icon: "sun", label: "Best Season", value: "Oct - Mar" },
      { icon: "temp", label: "Climate", value: d.climateLabel },
      { icon: "plane", label: "Nearest Airport", value: `${d.city} access` },
      { icon: "chat", label: "Language", value: "Hindi / English" },
      { icon: "inr", label: "Currency", value: "Indian Rupee (INR)" },
      { icon: "time", label: "Ideal Stay", value: "2 - 5 Days" },
    ],
    about: {
      label: d.region,
      heading: `Discover ${d.name}`,
      para1: d.tagline,
      para2: `${d.name} in ${d.state} is one of India's memorable travel stops, known for ${d.tags.slice(0, 3).join(", ").toLowerCase()}. Plan your route, stays and experiences around the season and the pace you prefer.`,
      tags: d.tags,
      ctaHeading: `Plan your ${d.name} trip`,
      ctaDesc: "Save this destination, compare activities and build your itinerary from one place.",
    },
    activities: [
      { title: `${d.name} Guided Experience`, category: "Sightseeing", duration: "3 hrs", price: "INR 899", image: gallery[1] || d.heroImage, badge: "Popular" },
      { title: `${d.city} Local Walk`, category: "Culture", duration: "2 hrs", price: "INR 499", image: gallery[2] || d.heroImage, badge: null },
      { title: `${d.state} Day Tour`, category: "Explore", duration: "Full Day", price: "INR 1,999", image: gallery[3] || d.heroImage, badge: "Recommended" },
    ],
    hotels: [
      { name: `${d.city} Heritage Stay`, stars: 4, price: "INR 4,500", perNight: "/night", image: "/images/unsplash-c98480910ba0.jpg", tag: "Central" },
      { name: `${d.name} Comfort Hotel`, stars: 4, price: "INR 3,200", perNight: "/night", image: "/images/unsplash-13bd5084b599.jpg", tag: "Value" },
      { name: `${d.state} Premium Resort`, stars: 5, price: "INR 8,500", perNight: "/night", image: "/images/unsplash-13bd5084b599.jpg", tag: "Premium" },
    ],
    transports: [
      { tier: "VVIP", title: "Luxury Chauffeur Fleet", vehicles: "BMW 5 Series, Mercedes E-Class, Audi A6", price: "INR 12,000", description: "Private chauffeur, airport pickup, bottled water and flexible sightseeing hours.", image: "/images/unsplash-c98480910ba0.jpg" },
      { tier: "VIP", title: "Premium SUV Plan", vehicles: "Toyota Fortuner, Innova Crysta, premium bike add-on", price: "INR 6,500", description: "Comfortable private vehicle for family sightseeing and hotel transfers.", image: "/images/unsplash-13bd5084b599.jpg" },
      { tier: "Normal", title: "Affordable Local Transport", vehicles: "AC cab, bus, shared taxi, rental bike", price: "INR 1,800", description: "Budget-friendly local movement with basic pickup support.", image: "/images/unsplash-7c5d196ce843.jpg" },
    ],
    meals: [
      { tier: "VVIP", title: "Chef Curated Meal Plan", includes: "Fine dining, private dinner, premium breakfast, local tasting menu", price: "INR 4,500", description: "Premium meals arranged around the itinerary with special dietary support.", image: "/images/unsplash-a6836391f181.jpg" },
      { tier: "VIP", title: "Comfort Meal Plan", includes: "Breakfast, lunch or dinner, popular local restaurants", price: "INR 2,200", description: "Balanced meal coverage with verified restaurants and regional food picks.", image: "/images/unsplash-451710d2942a.jpg" },
      { tier: "Normal", title: "Value Meal Plan", includes: "Breakfast and affordable local meals", price: "INR 900", description: "Simple, clean and affordable meals for budget travellers.", image: "/images/unsplash-7c5d196ce843.jpg" },
    ],
    flightIntro: `Reach ${d.name} through the nearest major airport and continue by road or rail where available.`,
    flights: [],
    flightTip: "Book earlier during weekends, festivals and peak travel months.",
    trainIntro: `${d.city} and nearby hubs are connected by Indian Railways on many popular routes.`,
    trains: [],
    trainTip: "Check train availability early if you are travelling during holidays.",
    airportName: `${d.city} Airport / nearest major airport`,
    airportCode: "",
    transferIntro: "Use local taxis, app cabs or pre-booked transfers depending on your arrival point.",
    transfers: [],
    transferTip: "Confirm pickup timings and fares before you start.",
    mapPoints: [],
    weatherData: [],
    seasons: [],
    reviewsData: [],
    communityPhotos: gallery,
    quickAdds: [
      { id: `${d.id}-activity`, name: `${d.name} experience`, type: "activity", duration: "3 hrs", price: 899, emoji: "pin" },
      { id: `${d.id}-hotel`, name: `${d.city} stay`, type: "hotel", duration: "1 night", price: 4500, emoji: "hotel" },
      { id: `${d.id}-transport`, name: "Local transfer", type: "transport", duration: "1 ride", price: 1200, emoji: "taxi" },
    ],
    botReplies: {
      default: `${d.name} is a great pick for ${d.tags.slice(0, 2).join(" and ").toLowerCase()}. Ask me about hotels, activities, weather or budget.`,
      hotel: `For ${d.name}, stay near the main attraction areas in ${d.city} if you want easy sightseeing.`,
      activity: `Start with a guided ${d.city} experience, then add local food, culture and nearby attractions.`,
      weather: `${d.name} has a ${d.climateLabel.toLowerCase()} climate. October to March is generally comfortable for most Indian destinations.`,
      price: `A comfortable ${d.name} trip can start around INR 3,000-INR 6,000 per person per day depending on hotels and transport.`,
      food: `Try local ${d.state} food around busy markets and trusted family restaurants.`,
    },
    createdAt: undefined,
    updatedAt: undefined,
  };
}

function normalizeCustom(d: any, isCustom = true, options: { compact?: boolean } = {}) {
  const images = d.photos?.length ? d.photos : d.images ?? [];
  const heroImage = d.heroImage || images[0] || "";
  const stateSlug = d.stateSlug || slugify(d.state);
  const climate = d.climate || d.climateLabel || "";
  const rawGallery = images.length ? images : [heroImage].filter(Boolean);
  const gallery = options.compact ? rawGallery.map(compactImage) : rawGallery;
  const displayHeroImage = options.compact ? compactImage(heroImage || rawGallery[0]) : heroImage;
  const coordinates = coordinatesForDestination(d);
  return {
    ...d,
    id: d.slug,
    dbId: d._id?.toString?.() ?? d.id ?? d.slug,
    name: d.name,
    slug: d.slug,
    city: d.city || d.name,
    state: d.state,
    stateSlug,
    country: d.country || "India",
    region: d.region,
    heroImage: displayHeroImage,
    images: gallery,
    photos: gallery,
    gallery,
    tagline: d.tagline,
    rating: d.rating,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    reviews: d.reviews ?? d.reviewCount ?? 0,
    reviewCount: d.reviewCount ?? d.reviews ?? 0,
    tags: d.tags ?? [],
    climateLabel: climate,
    climate,
    about: d.about && typeof d.about === "object" ? d.about : {
      label: d.region || d.state,
      heading: `Discover ${d.name}`,
      para1: d.about || d.tagline || "",
      para2: `${d.name} is a published destination in ${d.state}.`,
      tags: d.tags ?? [],
      ctaHeading: `Plan your ${d.name} trip`,
      ctaDesc: "Save this destination, compare activities and build your itinerary from one place.",
    },
    isPublished: d.isPublished ?? true,
    isCustom,
    
    // Arrays
    highlights: options.compact ? [] : d.highlights || [],
    activities: options.compact ? [] : d.activities || [],
    hotels: options.compact ? [] : d.hotels || [],
    transports: options.compact ? [] : d.transports || [],
    meals: options.compact ? [] : d.meals || [],
    flights: options.compact ? [] : d.flights || [],
    flightIntro: d.flightIntro || "",
    flightTip: d.flightTip || "",
    trains: options.compact ? [] : d.trains || [],
    trainIntro: d.trainIntro || "",
    trainTip: d.trainTip || "",
    transfers: options.compact ? [] : d.transfers || [],
    transferIntro: d.transferIntro || "",
    transferTip: d.transferTip || "",
    airportName: d.airportName || "",
    airportCode: d.airportCode || "",
    mapPoints: options.compact ? [] : d.mapPoints || [],
    weatherData: options.compact ? [] : d.weatherData || [],
    seasons: options.compact ? [] : d.seasons || [],
    reviewsData: options.compact ? [] : d.reviewsData || [],
    communityPhotos: options.compact ? [] : d.communityPhotos || [],
    quickAdds: options.compact ? [] : d.quickAdds || [],
    botReplies: d.botReplies || { default: "I'm your travel assistant!", hotel: "", activity: "", weather: "", price: "", food: "" },

    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

function normalizePhaseDestination(d: any, options: { compact?: boolean } = {}) {
  const gallery = (d.gallery?.length ? d.gallery : [d.heroImage]).filter(Boolean);
  const stateSlug = slugify(d.state);
  return {
    id: d.slug,
    dbId: d._id?.toString?.() ?? d.id ?? d.slug,
    slug: d.slug,
    name: d.name,
    city: d.name,
    state: d.state,
    stateSlug,
    country: "India",
    region: d.region,
    heroImage: d.heroImage,
    images: gallery,
    photos: gallery,
    gallery,
    tagline: d.description,
    rating: d.rating ?? 4.5,
    reviews: 0,
    reviewCount: 0,
    latitude: d.latitude ?? d.location?.coordinates?.[1] ?? 0,
    longitude: d.longitude ?? d.location?.coordinates?.[0] ?? 0,
    tags: [d.region, d.state].filter(Boolean),
    climateLabel: d.temperature || "",
    climate: d.temperature || "",
    isPublished: true,
    isCustom: true,
    highlights: options.compact ? [] : [
      { icon: "sun", label: "Best Time", value: d.bestTime || "Oct - Mar" },
      { icon: "temp", label: "Temperature", value: d.temperature || "Seasonal" },
      { icon: "chat", label: "Language", value: d.language || "Hindi / English" },
      { icon: "inr", label: "Currency", value: d.currency || "INR" },
    ],
    about: {
      label: d.region || d.state,
      heading: `Discover ${d.name}`,
      para1: d.description || "",
      para2: `${d.name} in ${d.state} is ready for stays, experiences and transport planning.`,
      tags: [d.region, d.state].filter(Boolean),
      ctaHeading: `Plan your ${d.name} trip`,
      ctaDesc: "Compare stays, experiences and travel options from one place.",
    },
    activities: [],
    hotels: [],
    transports: [],
    meals: [],
    flights: [],
    flightIntro: "",
    flightTip: "",
    trains: [],
    trainIntro: "",
    trainTip: "",
    transfers: [],
    transferIntro: "",
    transferTip: "",
    airportName: "",
    airportCode: "",
    mapPoints: [],
    weatherData: [],
    seasons: [],
    reviewsData: [],
    communityPhotos: options.compact ? [] : gallery,
    quickAdds: [],
    botReplies: { default: `Ask me about hotels, activities, weather or budget for ${d.name}.`, hotel: "", activity: "", weather: "", price: "", food: "" },
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

async function publishedCustomDestinationSummaries() {
  if (!isDBConnected()) return localCustomDests.filter((dest) => dest.isPublished).map(dest => normalizeCustom(dest, true, { compact: true }));
  try {
    const docs = await CustomDestModel.find({ isPublished: true })
      .select("slug name city state stateSlug country region heroImage tagline rating reviewCount reviews latitude longitude climateLabel climate tags isPublished createdAt updatedAt")
      .sort({ state: 1, city: 1, name: 1 })
      .lean<any[]>();
    return docs.map(dest => normalizeCustom(dest, true, { compact: true }));
  } catch (err) {
    return localCustomDests.filter((dest) => dest.isPublished).map(dest => normalizeCustom(dest, true, { compact: true }));
  }
}

async function publishedPhaseDestinationSummaries() {
  if (!isDBConnected()) return [];
  try {
    const docs = await PhaseDestinationModel.find()
      .sort({ state: 1, name: 1 })
      .lean<any[]>();
    return docs.map(dest => normalizePhaseDestination(dest, { compact: true }));
  } catch (err) {
    return [];
  }
}

async function findPublishedCustomDestination(filter: Record<string, unknown>) {
  if (!isDBConnected()) {
    const destination = localCustomDests.find((dest) => {
      if (!dest.isPublished) return false;
      return Object.entries(filter).every(([key, value]) => (dest as unknown as Record<string, unknown>)[key] === value);
    });
    return destination ? normalizeCustom(destination) : null;
  }
  const destination = await CustomDestModel.findOne({ ...filter, isPublished: true }).lean<any>();
  return destination ? normalizeCustom(destination) : null;
}

async function findPhaseDestinationBySlug(slug: string) {
  if (!isDBConnected()) return null;
  const normalizedSlug = slugify(slug);
  const readableName = normalizedSlug.replace(/-/g, " ");
  const escapedName = readableName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return PhaseDestinationModel.findOne({
    $or: [
      { slug },
      { slug: normalizedSlug },
      { name: new RegExp(`^${escapedName}$`, "i") },
    ],
  }).lean<any>();
}

async function findDestinationResourceBase(destinationSlug: string) {
  const customDestination = await findPublishedCustomDestination({ slug: destinationSlug });
  if (customDestination) return customDestination;

  const staticDestination = getDestinationById(destinationSlug);
  if (staticDestination) return normalizeStatic(staticDestination);

  const phaseDestination = await findPhaseDestinationBySlug(destinationSlug);
  return phaseDestination ? normalizePhaseDestination(phaseDestination) : null;
}

function normalizeDbHotel(hotel: any, context: { destinationSlug: string; destinationName: string; heroImage?: string; fallbackLocation?: string }) {
  return {
    id: hotel._id?.toString?.() ?? hotel.id,
    destinationSlug: context.destinationSlug,
    destinationName: context.destinationName,
    name: hotel.name,
    image: hotel.images?.[0] || context.heroImage || PLACEHOLDER_DESTINATION_IMAGE,
    images: hotel.images ?? [],
    price: `INR ${Number(hotel.pricePerNight || 0).toLocaleString("en-IN")}`,
    pricePerNight: hotel.pricePerNight ?? 0,
    perNight: "/night",
    rating: hotel.rating ?? 4.5,
    stars: Math.round(hotel.rating ?? 4),
    location: hotel.address || context.fallbackLocation || "",
    description: hotel.description || "",
    amenities: hotel.amenities ?? [],
    tag: hotel.amenities?.[0] || null,
  };
}

function normalizeDbActivity(activity: any, context: { destinationSlug: string; destinationName: string; heroImage?: string }) {
  return {
    id: activity._id?.toString?.() ?? activity.id,
    destinationSlug: context.destinationSlug,
    destinationName: context.destinationName,
    title: activity.title,
    name: activity.title,
    category: activity.difficulty || "Experience",
    duration: activity.duration || "",
    price: `INR ${Number(activity.price || 0).toLocaleString("en-IN")}`,
    amount: activity.price ?? 0,
    image: activity.images?.[0] || context.heroImage || PLACEHOLDER_DESTINATION_IMAGE,
    images: activity.images ?? [],
    description: activity.description || "",
    badge: null,
  };
}

function uniqueByName<T extends { id?: string; name?: string; title?: string }>(items: T[]) {
  return items.filter((item, index, all) => {
    const label = (item.name || item.title || "").toLowerCase();
    return index === all.findIndex(other =>
      (Boolean(item.id) && other.id === item.id) ||
      (label && (other.name || other.title || "").toLowerCase() === label)
    );
  });
}

async function enrichDestinationResources(destination: any) {
  const phaseDestination = await findPhaseDestinationBySlug(destination.slug);
  if (!phaseDestination || !isDBConnected()) return destination;

  const [dbHotels, dbActivities] = await Promise.all([
    HotelModel.find({ destinationId: phaseDestination._id }).sort({ rating: -1, pricePerNight: 1 }).limit(50).lean<any[]>(),
    ActivityModel.find({ destinationId: phaseDestination._id }).sort({ price: 1, title: 1 }).limit(100).lean<any[]>(),
  ]);
  const context = {
    destinationSlug: destination.slug,
    destinationName: destination.name,
    heroImage: destination.heroImage || phaseDestination.heroImage,
    fallbackLocation: phaseDestination.state || destination.city || destination.name,
  };

  return {
    ...destination,
    hotels: uniqueByName([...dbHotels.map(hotel => normalizeDbHotel(hotel, context)), ...(destination.hotels ?? [])]),
    activities: uniqueByName([...dbActivities.map(activity => normalizeDbActivity(activity, context)), ...(destination.activities ?? [])]),
  };
}

async function allPublishedDestinationSummaries() {
  const byRoute = new Map<string, ReturnType<typeof normalizeStatic>>();
  for (const destination of DESTINATIONS.map((dest) => normalizeStatic(dest))) {
    byRoute.set(`${destination.stateSlug}/${destination.slug}`, destination);
  }
  for (const destination of await publishedPhaseDestinationSummaries()) {
    const routeKey = `${destination.stateSlug}/${destination.slug}`;
    if (!byRoute.has(routeKey)) byRoute.set(routeKey, destination);
  }
  for (const destination of await publishedCustomDestinationSummaries()) {
    byRoute.set(`${destination.stateSlug}/${destination.slug}`, destination);
  }
  return Array.from(byRoute.values());
}

router.get("/destinations", async (req, res) => {
  const search = String(req.query.search ?? "").toLowerCase().trim();
  const state = String(req.query.state ?? "").toLowerCase().trim();
  const status = String(req.query.status ?? "published");
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 60), 1), 120);

  let destinations = await allPublishedDestinationSummaries();
  if (status !== "all") destinations = destinations.filter(dest => dest.isPublished);
  if (state) destinations = destinations.filter(dest => dest.stateSlug === state || dest.state.toLowerCase() === state);
  if (search) {
    destinations = destinations.filter(dest =>
      dest.name.toLowerCase().includes(search) ||
      dest.city.toLowerCase().includes(search) ||
      dest.state.toLowerCase().includes(search) ||
      dest.tagline.toLowerCase().includes(search) ||
      dest.tags.some((tag: string) => tag.toLowerCase().includes(search))
    );
  }

  const total = destinations.length;
  const start = (page - 1) * limit;
  const paged = destinations.slice(start, start + limit);
  const states = Array.from(new Map(destinations.map(dest => [dest.stateSlug, { state: dest.state, stateSlug: dest.stateSlug }])).values())
    .sort((a, b) => a.state.localeCompare(b.state));

  res.json({ destinations: paged, states, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
});

router.get("/hotels", async (req, res) => {
  const destinationSlug = String(req.query.destination ?? req.query.destinationSlug ?? "").trim();
  if (!destinationSlug) {
    res.json({ hotels: [] });
    return;
  }

  const destination = await findDestinationResourceBase(destinationSlug);
  const enrichedDestination = destination ? await enrichDestinationResources(destination) : null;
  res.json({ hotels: enrichedDestination?.hotels ?? [] });
});

router.get("/activities", async (req, res) => {
  const destinationSlug = String(req.query.destination ?? req.query.destinationSlug ?? "").trim();
  if (!destinationSlug) {
    res.json({ activities: [] });
    return;
  }

  const destination = await findDestinationResourceBase(destinationSlug);
  const enrichedDestination = destination ? await enrichDestinationResources(destination) : null;
  res.json({ activities: enrichedDestination?.activities ?? [] });
});

router.get("/destinations/:stateSlug/:slug", async (req, res) => {
  const { stateSlug, slug } = req.params;
  const customDestination = await findPublishedCustomDestination({ stateSlug, slug });
  const staticDestination = DESTINATIONS.find(dest => (dest.stateSlug || slugify(dest.state)) === stateSlug && dest.slug === slug);
  const phaseDestination = await findPhaseDestinationBySlug(slug);
  const normalizedPhaseDestination = phaseDestination ? normalizePhaseDestination(phaseDestination) : null;
  const baseDestination = customDestination || (staticDestination ? normalizeStatic(staticDestination) : null) || (normalizedPhaseDestination?.stateSlug === stateSlug ? normalizedPhaseDestination : null);
  const destination = baseDestination ? await enrichDestinationResources(baseDestination) : null;
  if (!destination) {
    res.status(404).json({ error: "Destination not found." });
    return;
  }
  const allDestinations = await allPublishedDestinationSummaries();
  const nearbyDestinations = allDestinations
    .filter(d => d.stateSlug === destination.stateSlug && d.slug !== destination.slug)
    .slice(0, 3);
    
  res.json({ destination, nearbyDestinations });
});

router.get("/destinations/:id", async (req, res) => {
  const customDestination = await findPublishedCustomDestination({ slug: req.params.id });
  const staticDestination = getDestinationById(req.params.id);
  const phaseDestination = await findPhaseDestinationBySlug(req.params.id);
  const baseDestination = customDestination || (staticDestination ? normalizeStatic(staticDestination) : null) || (phaseDestination ? normalizePhaseDestination(phaseDestination) : null);
  const destination = baseDestination ? await enrichDestinationResources(baseDestination) : null;
  if (!destination) {
    res.status(404).json({ error: "Destination not found." });
    return;
  }
  const allDestinations = await allPublishedDestinationSummaries();
  const nearbyDestinations = allDestinations
    .filter(d => d.stateSlug === destination.stateSlug && d.slug !== destination.slug)
    .slice(0, 3);
    
  res.json({ destination, nearbyDestinations });
});

export default router;
