import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { heroSlides, travelPackages, travellerMoments as fallbackMoments } from "@/data/premiumTravel";
import { indiaStatePaths } from "@/data/indiaSvgData";
import { apiFetch } from "@/lib/api";
import { useUser } from "@/context/UserContext";
import { Story, StoryModal } from "./StoryModal";

const FALLBACK_TRAVEL_IMAGE = "/images/unsplash-be41aa2e4372.jpg";

function TravelImage({ src, alt, className }: { src?: string; alt?: string; className?: string }) {
  const [currentSrc, setCurrentSrc] = useState(src || FALLBACK_TRAVEL_IMAGE);

  useEffect(() => {
    setCurrentSrc(src || FALLBACK_TRAVEL_IMAGE);
  }, [src]);

  return (
    <img
      src={currentSrc}
      alt={alt || ""}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => {
        if (currentSrc !== FALLBACK_TRAVEL_IMAGE) setCurrentSrc(FALLBACK_TRAVEL_IMAGE);
      }}
    />
  );
}

interface PremiumHeroProps {
  destinationCount: number;
  search: string;
  onSearch: (value: string) => void;
  onChip: (chip: string) => void;
  onPlanTrip: () => void;
}

export function PremiumHero({ destinationCount, search, onSearch, onChip, onPlanTrip }: PremiumHeroProps) {
  const [index, setIndex] = useState(0);
  const active = heroSlides[index];

  useEffect(() => {
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % heroSlides.length), 6500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="relative h-[70svh] min-h-[400px] max-h-[620px] overflow-hidden bg-stone-950 pt-[env(safe-area-inset-top)] md:min-h-[680px] md:max-h-[760px]">
      <motion.video
        autoPlay
        loop
        muted
        playsInline
        initial={{ scale: 1 }}
        animate={{ scale: 1.05 }}
        transition={{ duration: 20, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        className="absolute inset-0 h-full w-full object-cover"
        src="https://res.cloudinary.com/dwuafqgc2/video/upload/v1780994725/13861364_3840_2160_30fps_zcg5s1.mp4"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#f8f5f0] to-transparent" />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-4 pb-8 pt-24 sm:px-8 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl"
        >
          <div className="mb-4 inline-flex max-w-full items-center gap-3 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-md sm:px-4 sm:text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
            <span className="truncate">{active.name} - {active.label}</span>
          </div>
          <h1 className="max-w-3xl text-4xl font-black leading-[1.05] text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Find your next escape
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base md:text-lg">
            Curated India trips, premium stays, and local experiences in one place.
          </p>

          <div className="mt-7 max-w-3xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                onClick={onPlanTrip}
                className="h-12 w-fit rounded-full bg-indigo-600 px-6 text-sm font-black text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] transition hover:bg-indigo-500 hover:scale-105"
              >
                Plan My Trip
              </button>
              
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                {["Beach", "Mountains", "Adventure", "Heritage", "Spiritual", "Family"].map((chip) => (
                <button
                  key={chip}
                  onClick={() => onChip(chip)}
                  className="shrink-0 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white hover:text-stone-900"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
          </div>
        </motion.div>

        <div className="mt-7 grid max-w-xl grid-cols-4 gap-2">
          {[
            ["Destinations", destinationCount > 0 ? `${destinationCount}+` : "16+"],
            ["Reviews", "50K+"],
            ["Travellers", "1L+"],
            ["Avg Rating", "4.8"],
          ].map(([label, value], i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 * i }}
              className="group rounded-2xl border border-white/15 bg-white/10 p-3 text-white backdrop-blur-md transition-all hover:-translate-y-1 hover:bg-white/20 sm:p-4"
            >
              <div className="text-lg font-black sm:text-2xl md:text-3xl">{value}</div>
              <div className="mt-1 text-[9px] font-semibold tracking-wide text-white/70 uppercase sm:text-[10px]">{label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface PremiumHomeSectionsProps {
  destinations?: any[];
  onPackageOpen: (id: string) => void;
  onRegionSelect: (region: string) => void;
  onOpenAllPackages: () => void;
}

const REGION_META: Record<string, { id: string; fill: string; hoverFill: string }> = {
  "North India": { id: "north", fill: "#f59e0b", hoverFill: "#d97706" },
  "West India": { id: "west", fill: "#0ea5e9", hoverFill: "#0284c7" },
  "East India": { id: "east", fill: "#f43f5e", hoverFill: "#e11d48" },
  "South India": { id: "south", fill: "#10b981", hoverFill: "#059669" },
  "North East India": { id: "north-east", fill: "#8b5cf6", hoverFill: "#7c3aed" },
  "Central India": { id: "central", fill: "#f97316", hoverFill: "#ea580c" },
};

export function PremiumHomeSections({ destinations = [], onPackageOpen, onRegionSelect, onOpenAllPackages }: PremiumHomeSectionsProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [packages, setPackages] = useState<any[]>(travelPackages);
  const { user } = useUser();

  useEffect(() => {
    apiFetch<{ items: Story[] }>("/v1/reviews/featured")
      .then(res => setStories(res.items))
      .catch(console.error);

    apiFetch<{ items: any[] }>("/v1/packages/featured")
      .then(res => {
        if (res.items) {
          setPackages(res.items);
        }
      })
      .catch(console.error);
  }, []);

  const onUpdate = (updated: Story) => {
    const uId = updated.id || updated._id;
    setStories(s => s.map(st => {
      const stId = st.id || st._id;
      return stId === uId ? updated : st;
    }));
    if (activeStory) {
      const aId = activeStory.id || activeStory._id;
      if (uId && aId === uId) {
        setActiveStory(updated);
      }
    }
  };

  // Aggregate destination counts and lists by region
  const regionData = Object.keys(REGION_META).map(rName => {
    const rDestinations = destinations.filter(d => d.region === rName);
    return {
      id: REGION_META[rName].id,
      fullName: rName,
      query: rName,
      count: rDestinations.length,
      fill: REGION_META[rName].fill,
      hoverFill: REGION_META[rName].hoverFill,
      destinations: [...new Set(rDestinations.map(d => d.state))].slice(0, 4), // show up to 4 states
    };
  });

  const [activeRegionId, setActiveRegionId] = useState("north");
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);

  const activeRegion = regionData.find(region => region.id === (hoveredRegionId ?? activeRegionId)) ?? regionData[0];

  function selectRegion(region: typeof regionData[0]) {
    setActiveRegionId(region.id);
    onRegionSelect(region.query);
  }

  return (
    <div className="bg-[#f8f5f0]">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-8 md:py-14 lg:px-10">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-500">Curated Trips</p>
            <h2 className="mt-2 text-2xl font-black text-stone-950 sm:text-3xl">Trending Packages</h2>
          </div>
          <button onClick={onOpenAllPackages} className="self-start rounded-full bg-stone-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700 sm:self-auto sm:text-sm">
            View all packages
          </button>
        </div>
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4">
          {packages.slice(0, 4).map((pkg, index) => (
            <motion.button
              key={pkg.id}
              onClick={() => onPackageOpen(pkg.id)}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: index * 0.05 }}
              className="group w-[292px] shrink-0 snap-start overflow-hidden rounded-2xl border border-stone-100 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:w-[320px] md:w-auto"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <TravelImage src={pkg.coverImage} alt={pkg.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-black text-indigo-700">{pkg.duration}</div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="line-clamp-2 text-xl font-black leading-tight text-white">{pkg.title}</h3>
                  <p className="text-xs font-semibold text-white/70">{pkg.destination}</p>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-stone-950">{pkg.price}</span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">{pkg.rating.toFixed(1)} rating</span>
                </div>
                <div className="mt-3 space-y-2">
                  {pkg.highlights.slice(0, 2).map((item: string) => (
                    <div key={item} className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {item}
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-xs font-black text-indigo-600">Explore package</div>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[0.86fr_1.14fr] lg:px-10">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-600">Interactive India Map</p>
          <h2 className="mt-2 text-2xl font-black text-stone-950 sm:text-3xl">Pick a region. Watch the destinations adjust.</h2>
          <p className="mt-4 text-sm leading-7 text-stone-500">
            Explore India through six robust travel regions. Hover a region for details, then tap it to filter destinations instantly.
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRegion.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="mt-7 rounded-2xl border border-stone-200 bg-white/80 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">Selected Region</p>
                  <h3 className="mt-1 text-2xl font-black text-stone-950">{activeRegion.fullName}</h3>
                </div>
                <div className="rounded-2xl px-4 py-3 text-center text-white shadow-sm" style={{ backgroundColor: activeRegion.fill }}>
                  <div className="text-2xl font-black">{activeRegion.count}</div>
                  <div className="text-[10px] font-black uppercase tracking-wide text-white/80">Destinations</div>
                </div>
              </div>
              <div className="mt-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">States in Region</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {activeRegion.destinations.length > 0 ? (
                  activeRegion.destinations.map(state => (
                    <button
                      key={state}
                      onClick={() => onRegionSelect(activeRegion.fullName)}
                      className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-left text-xs font-black text-stone-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                    >
                      {state}
                    </button>
                  ))
                ) : (
                  <div className="col-span-2 text-xs font-medium text-stone-400">New destinations coming soon!</div>
                )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] border border-orange-100 bg-[#fffaf0] p-4 shadow-[0_24px_80px_rgba(120,53,15,0.10)] sm:p-6 md:min-h-[500px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(251,146,60,0.16),transparent_28%),radial-gradient(circle_at_90%_18%,rgba(14,165,233,0.16),transparent_26%),linear-gradient(135deg,#fff7ed,#f8fafc_48%,#ecfdf5)]" />
          <div className="absolute left-6 top-6 rounded-full border border-orange-200 bg-white/75 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-orange-700 shadow-sm backdrop-blur z-10">
            Interactive States Map
          </div>
          
          <div className="relative mx-auto h-[360px] w-full max-w-[460px] overflow-visible md:h-[500px]">
            <svg
              viewBox="0 0 612 696"
              aria-label="Interactive map of India"
              className="w-full h-full drop-shadow-xl"
              role="img"
              style={{ filter: "drop-shadow(0px 14px 12px rgba(120,53,15,0.16))" }}
            >
              <g>
                {indiaStatePaths.map(state => {
                  const rData = regionData.find(r => r.fullName === state.region);
                  if (!rData) return null;
                  
                  const isActive = activeRegionId === rData.id;
                  const isHovered = hoveredRegionId === rData.id;
                  
                  return (
                    <motion.path
                      key={state.id}
                      d={state.path}
                      fill={isActive || isHovered ? rData.hoverFill : rData.fill}
                      stroke="#fffaf0"
                      strokeWidth={isActive ? 2 : 1}
                      className="cursor-pointer outline-none transition-colors duration-300"
                      role="button"
                      tabIndex={0}
                      aria-label={`${state.name}, part of ${rData.fullName}`}
                      onClick={() => selectRegion(rData)}
                      onFocus={() => setHoveredRegionId(rData.id)}
                      onBlur={() => setHoveredRegionId(null)}
                      onMouseEnter={() => setHoveredRegionId(rData.id)}
                      onMouseLeave={() => setHoveredRegionId(null)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectRegion(rData);
                        }
                      }}
                      whileHover={{ filter: "brightness(1.08)" }}
                    />
                  );
                })}
              </g>
            </svg>
          </div>
          <AnimatePresence>
            {(hoveredRegionId || activeRegionId) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-xl backdrop-blur z-10"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-stone-950">{activeRegion.fullName}</div>
                    <div className="mt-1 text-xs font-semibold text-stone-500">{activeRegion.destinations.join(" · ")}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-orange-600">{activeRegion.count}</div>
                    <div className="text-[10px] font-black uppercase tracking-wide text-stone-400">Destinations</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-8 md:py-14 lg:px-10">
        <div className="mb-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-500">Real Traveller Moments</p>
          <h2 className="mt-2 text-2xl font-black text-stone-950 sm:text-3xl">Stories that feel like you were there</h2>
        </div>
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 lg:pb-0">
          {stories.length > 0 ? stories.map((story, index) => (
            <motion.div
              key={story.id || story._id}
              onClick={() => setActiveStory(story)}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="w-[220px] shrink-0 snap-start overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow lg:w-auto"
            >
              <TravelImage src={story.images[0] || "/images/unsplash-451710d2942a.jpg"} alt={story.destinationId?.name} className="h-64 w-full object-cover" />
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-stone-900">{story.userId?.name || "Traveller"}</div>
                    <div className="text-xs text-stone-400">{story.destinationId?.name}</div>
                  </div>
                  <div className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-600">❤️ {story.likes?.length || 0}</div>
                </div>
                <div className="mt-3 inline-flex rounded-full bg-stone-100 px-3 py-1 text-[11px] font-black text-stone-600">{story.title}</div>
              </div>
            </motion.div>
          )) : fallbackMoments.map((moment, index) => (
            <motion.div
              key={moment.id}
              onClick={() => setActiveStory({
                _id: `fallback-${moment.id}`,
                userId: { _id: "dummy", name: moment.user, avatar: null },
                destinationId: { _id: "dummy", name: moment.destination, slug: "" },
                rating: 5,
                title: "A journey to remember",
                review: "This is a preview story. Once the database finishes seeding, real stories will appear here!",
                images: [moment.image],
                likes: [],
                saves: [],
                comments: [],
                createdAt: new Date().toISOString(),
              })}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="w-[220px] shrink-0 snap-start overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow lg:w-auto"
            >
              <TravelImage src={moment.image} alt={moment.destination} className="h-64 w-full object-cover" />
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-stone-900">{moment.user}</div>
                    <div className="text-xs text-stone-400">{moment.destination}</div>
                  </div>
                  <div className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-600">{moment.likes}</div>
                </div>
                <div className="mt-3 inline-flex rounded-full bg-stone-100 px-3 py-1 text-[11px] font-black text-stone-600">{moment.tag}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {activeStory && (
        <StoryModal
          story={activeStory}
          currentUserId={user?.id}
          onClose={() => setActiveStory(null)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
