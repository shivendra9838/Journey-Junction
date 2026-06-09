import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useWishlist } from "@/context/WishlistContext";
import { useUser } from "@/context/UserContext";
import ProfileDropdown from "@/components/ProfileDropdown";
import Navbar from "@/components/Navbar";
import { apiFetch } from "@/lib/api";
import { PremiumHero, PremiumHomeSections } from "@/components/premium/HomeExperience";

interface DestSummary {
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
  tagline: string;
  rating: number;
  reviewCount: number;
  tags: string[];
  climateLabel: string;
  isCustom: boolean;
}

function WandrLogo({ className = "" }: { className?: string }) {
  return (
    <img src="/logo.png" alt="Journey Junction" className={className} />
  );
}

const REGION_COLORS: Record<string, string> = {
  "West India":  "bg-sky-100 text-sky-700",
  "South India": "bg-emerald-100 text-emerald-700",
  "North India": "bg-amber-100 text-amber-700",
  "East India": "bg-rose-100 text-rose-700",
  "North East India": "bg-purple-100 text-purple-700",
  "Central India": "bg-orange-100 text-orange-700",
};

const REGIONS = [
  { label: "West India",  emoji: "🌊" },
  { label: "South India", emoji: "🌴" },
  { label: "North India", emoji: "⛰️" },
  { label: "East India", emoji: "🛕" },
  { label: "North East India", emoji: "🌿" },
  { label: "Central India", emoji: "🐅" },
];

const VIBES = [
  { label: "Beach",     emoji: "🏖️", match: ["Beach", "Beaches"] },
  { label: "Mountains", emoji: "⛰️", match: ["Mountains", "Snow", "Skiing", "Trekking"] },
  { label: "Heritage",  emoji: "🏛️", match: ["Heritage", "Forts", "Palaces", "History", "Taj Mahal"] },
  { label: "Nature",    emoji: "🌿", match: ["Backwaters", "Tea Gardens", "Wildlife", "Monasteries"] },
  { label: "Spiritual", emoji: "🙏", match: ["Spiritual", "Pilgrimage", "Yoga", "Varanasi"] },
  { label: "City",      emoji: "🌆", match: ["Bollywood", "Business", "Nightlife", "Food", "Sea"] },
  { label: "Desert",    emoji: "🏜️", match: ["Desert"] },
];

const SEASONS = [
  { label: "Winter",  display: "Winter (Oct–Mar)", emoji: "❄️",  ids: ["goa", "kerala", "rajasthan", "up", "mumbai"] },
  { label: "Summer",  display: "Summer (Apr–Jun)", emoji: "🌸", ids: ["himachal", "kashmir"] },
];

function destinationIdentity(dest: DestSummary) {
  return `${dest.stateSlug || dest.state.toLowerCase()}::${dest.slug || dest.id || dest.name.toLowerCase()}`;
}

function dedupeDestinations(items: DestSummary[]) {
  const seen = new Set<string>();
  return items.filter((dest) => {
    const identity = destinationIdentity(dest);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

export default function HomePage() {
  const [, navigate] = useLocation();
  const { isDestSaved, toggleDestination, totalCount } = useWishlist();
  const { user } = useUser();
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [vibeFilter,   setVibeFilter]   = useState<string | null>(null);
  const [seasonFilter, setSeasonFilter] = useState<string | null>(null);
  const [destinations, setDestinations] = useState<DestSummary[]>([]);
  const [destsLoading, setDestsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadDestinations(showLoading = false) {
      if (showLoading) setDestsLoading(true);
      try {
        const data = await apiFetch<{ destinations: DestSummary[] }>("/destinations");
        if (!cancelled) setDestinations(dedupeDestinations(data.destinations ?? []));
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setDestsLoading(false);
      }
    }

    void loadDestinations(true);
    const interval = window.setInterval(() => void loadDestinations(false), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const activeCount = [regionFilter, vibeFilter, seasonFilter].filter(Boolean).length;

  function clearAll() {
    setRegionFilter(null);
    setVibeFilter(null);
    setSeasonFilter(null);
  }

  function toggle<T extends string>(current: T | null, val: T, set: (v: T | null) => void) {
    set(current === val ? null : val);
  }

  function destinationPath(dest: DestSummary) {
    return dest.stateSlug && dest.slug ? `/destinations/${dest.stateSlug}/${dest.slug}` : `/destination/${dest.id}`;
  }

  function applyHeroChip(chip: string) {
    if (chip === "Family") {
      setSearch("family");
      return;
    }
    const vibe = VIBES.find(item => item.label === chip);
    if (vibe) setVibeFilter(chip);
  }

  const filtered = destinations.filter(d => {

    if (regionFilter && d.region !== regionFilter) return false;

    if (vibeFilter) {
      const vibe = VIBES.find(v => v.label === vibeFilter);
      if (vibe && !vibe.match.some(tag => d.tags.includes(tag))) return false;
    }

    if (seasonFilter) {
      const season = SEASONS.find(s => s.label === seasonFilter);
      if (season && !season.ids.includes(d.id)) return false;
    }

    return true;
  });

  const hasFilters = activeCount > 0;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8f5f0] font-sans text-stone-800">
      <Navbar />

      <PremiumHero
        destinationCount={destinations.length}
        search=""
        onSearch={() => {}}
        onChip={applyHeroChip}
        onPlanTrip={() => navigate("/plan-trip")}
      />

      {/* Hero banner */}
      <div className="hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-sky-600" />
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }}
        />
        <div className="relative px-10 py-20 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/25 text-white text-xs font-semibold mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {destinations.length > 0 ? `${destinations.length} Incredible India Destinations` : "Incredible India Destinations"}
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight tracking-tight mb-4">
            Explore Incredible India
          </h1>
          <p className="text-indigo-200 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            From Goa's golden beaches to Kashmir's Dal Lake, from Rajasthan's royal palaces to Kerala's misty backwaters — every journey starts here.
          </p>

          {/* Plan My Trip CTA */}
          <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => navigate("/plan-trip")}
              className="flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-indigo-700 text-sm font-bold shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Plan My Trip
            </button>
            <span className="text-indigo-200 text-sm">Free · Personalised · Instant</span>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-b border-stone-100 px-10">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-12 py-5">
          {[
            { label: "Destinations",      value: "7" },
            { label: "Verified Reviews",  value: "50K+" },
            { label: "Happy Travellers",  value: "1.2L+" },
            { label: "Expert Itineraries",value: "200+" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-xl font-extrabold text-stone-900">{s.value}</div>
              <div className="text-xs text-stone-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <PremiumHomeSections
        destinations={destinations}
        onPackageOpen={(id) => navigate(`/packages?package=${id}`)}
        onOpenAllPackages={() => navigate("/packages")}
        onRegionSelect={(region) => {
          setRegionFilter(["West India", "South India", "North India", "East India", "North East India", "Central India"].includes(region) ? region : null);
          setRegionFilter(["West India", "South India", "North India", "East India", "North East India", "Central India"].includes(region) ? region : null);
          window.setTimeout(() => document.getElementById("destinations-grid")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
        }}
      />

      {/* Destinations Grid */}
      <div id="destinations-grid" className="max-w-7xl mx-auto px-4 md:px-10 py-8 md:py-14">

        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">Explore India</div>
            <h2 className="text-3xl font-extrabold text-stone-900">
              {hasFilters
                ? `${filtered.length} destination${filtered.length !== 1 ? "s" : ""} found`
                : "All Destinations"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {hasFilters && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-stone-100 hover:bg-stone-200 transition-colors text-xs font-semibold text-stone-600"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear all
                {activeCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">{activeCount}</span>
                )}
              </button>
            )}
            <div className="text-sm text-stone-400">{destinations.length} destinations</div>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="bg-white border border-stone-100 rounded-2xl shadow-sm p-4 mb-8 space-y-3">

          {/* Region row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest w-16 shrink-0">Region</span>
            {REGIONS.map(r => (
              <button
                key={r.label}
                onClick={() => toggle(regionFilter, r.label, setRegionFilter)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  regionFilter === r.label
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-stone-600 border-stone-200 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                <span>{r.emoji}</span> {r.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-stone-100" />

          {/* Vibe row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest w-16 shrink-0">Vibe</span>
            {VIBES.map(v => (
              <button
                key={v.label}
                onClick={() => toggle(vibeFilter, v.label, setVibeFilter)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  vibeFilter === v.label
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-stone-600 border-stone-200 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                <span>{v.emoji}</span> {v.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-stone-100" />

          {/* Season row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest w-16 shrink-0">Season</span>
            {SEASONS.map(s => (
              <button
                key={s.label}
                onClick={() => toggle(seasonFilter, s.label, setSeasonFilter)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  seasonFilter === s.label
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-stone-600 border-stone-200 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                <span>{s.emoji}</span> {s.display}
              </button>
            ))}
          </div>
        </div>

        {/* Active filter tags summary */}
        {(regionFilter || vibeFilter || seasonFilter) && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
            <span className="text-xs text-stone-400 font-medium">Active filters:</span>
            {regionFilter && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                {REGIONS.find(r => r.label === regionFilter)?.emoji} {regionFilter}
                <button onClick={() => setRegionFilter(null)} className="hover:text-indigo-900 ml-0.5 leading-none">×</button>
              </span>
            )}
            {vibeFilter && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                {VIBES.find(v => v.label === vibeFilter)?.emoji} {vibeFilter}
                <button onClick={() => setVibeFilter(null)} className="hover:text-indigo-900 ml-0.5 leading-none">×</button>
              </span>
            )}
            {seasonFilter && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                {SEASONS.find(s => s.label === seasonFilter)?.emoji} {SEASONS.find(s => s.label === seasonFilter)?.display}
                <button onClick={() => setSeasonFilter(null)} className="hover:text-indigo-900 ml-0.5 leading-none">×</button>
              </span>
            )}
          </div>
        )}

        {/* Grid */}
        {filtered.length === 0 ? (
          regionFilter ? (
            <div className="max-w-2xl mx-auto my-10 bg-white border border-orange-100 rounded-3xl p-8 md:p-12 shadow-[0_20px_40px_rgba(234,88,12,0.08)] text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,146,60,0.1),transparent_50%)] pointer-events-none" />
              <div className="text-5xl mb-6">🚧</div>
              <h3 className="text-2xl md:text-3xl font-black text-stone-900 mb-4">New Adventures Are Coming Soon!</h3>
              <div className="space-y-4 text-stone-600 text-sm md:text-base leading-relaxed">
                <p>We're currently expanding our travel experiences in this region and carefully curating unforgettable destinations, local experiences, transport options, and personalized itineraries.</p>
                <p>Our travel team is actively working to bring you the best recommendations and seamless booking experiences.</p>
                <p className="font-semibold text-indigo-600">✈️ Stay tuned — exciting destinations and handcrafted journeys will be available here very soon.</p>
                <p>In the meantime, explore other regions across India and discover your next adventure.</p>
              </div>
              <button onClick={clearAll} className="mt-8 px-6 py-3 rounded-full bg-stone-900 text-white font-bold hover:bg-indigo-600 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                Explore Other Regions
              </button>
            </div>
          ) : (
            <div className="text-center py-20 text-stone-400">
              <div className="text-5xl mb-4">🗺️</div>
              <p className="text-lg font-medium text-stone-500">No destinations match your filters</p>
              <p className="text-sm mt-1 mb-5">Try removing a filter or searching something else</p>
              <button onClick={clearAll} className="px-5 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
                Clear all filters
              </button>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {filtered.map((dest, index) => {
              const regionCls = REGION_COLORS[dest.region] ?? "bg-stone-100 text-stone-600";
              return (
                <div
                  key={`${destinationIdentity(dest)}-${index}`}
                  onClick={() => navigate(destinationPath(dest))}
                  className="group rounded-3xl overflow-hidden bg-white border border-stone-100 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1"
                >
                  {/* Card image */}
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={dest.heroImage.replace("w=1600", "w=700").replace("q=90", "q=80")}
                      alt={dest.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-sm ${regionCls.split(" ")[1]}`}>
                        {dest.region}
                      </span>
                    </div>
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      {/* Heart / wishlist button */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          toggleDestination({ id: dest.id, name: dest.name, state: dest.state, heroImage: dest.heroImage, rating: dest.rating, region: dest.region, tagline: dest.tagline });
                        }}
                        className={`w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 ${isDestSaved(dest.id) ? "bg-rose-500/90" : "bg-black/35 hover:bg-black/50"}`}
                        title={isDestSaved(dest.id) ? "Remove from Wishlist" : "Save to Wishlist"}
                      >
                        <svg
                          className={`w-4 h-4 transition-all ${isDestSaved(dest.id) ? "fill-white text-white" : "fill-none text-white"}`}
                          viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                        </svg>
                      </button>
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm">
                        <svg className="w-3 h-3 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        <span className="text-white text-[11px] font-bold">{dest.rating}</span>
                      </div>
                    </div>
                    <div className="absolute bottom-4 left-4">
                      <h3 className="text-white text-2xl font-extrabold leading-tight drop-shadow-sm">{dest.name}</h3>
                      <p className="text-white/70 text-xs mt-0.5">{dest.city ? `${dest.city}, ` : ""}{dest.state}, {dest.country}</p>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-5">
                    <p className="text-stone-500 text-sm leading-relaxed mb-3 line-clamp-2">{dest.tagline}</p>

                    {/* Vibe tags */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-4">
                      {dest.tags.slice(0, 3).map(tag => {
                        const vibe = VIBES.find(v => v.match.includes(tag));
                        return (
                          <span
                            key={tag}
                            onClick={e => { e.stopPropagation(); setVibeFilter(vibe?.label ?? null); }}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors cursor-pointer ${
                              vibeFilter === vibe?.label
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-stone-50 text-stone-500 border-stone-200 hover:border-indigo-300 hover:text-indigo-600"
                            }`}
                          >
                            {vibe ? `${vibe.emoji} ` : ""}{tag}
                          </span>
                        );
                      })}
                      {dest.isCustom && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white border border-indigo-600">
                          New
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                      <div className="flex items-center gap-1 text-xs text-stone-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                        </svg>
                        {dest.reviewCount.toLocaleString()} reviews
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); navigate(destinationPath(dest)); }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
                      >
                        Explore
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 mt-4">
        {/* Main footer grid */}
        <div className="max-w-7xl mx-auto px-10 pt-14 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">

            {/* Brand column */}
            <div className="lg:col-span-2">
              <WandrLogo className="h-[32px] md:h-[36px] w-auto object-contain flex-shrink-0 scale-[1.5] md:scale-[1.8] origin-left mb-4" />
              <p className="text-sm leading-relaxed text-stone-400 max-w-xs mb-5">
                India's most trusted travel platform — curating unforgettable journeys across 7 iconic destinations with expert itineraries, verified reviews, and local expertise.
              </p>
              {/* Social icons */}
              <div className="flex items-center gap-3">
                {[
                  { label: "Instagram", icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" },
                  { label: "Facebook",  icon: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
                  { label: "Twitter / X", icon: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
                  { label: "YouTube",   icon: "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
                ].map(s => (
                  <a key={s.label} href="#" aria-label={s.label} className="w-8 h-8 rounded-full bg-stone-800 hover:bg-indigo-600 flex items-center justify-center transition-colors group">
                    <svg className="w-3.5 h-3.5 text-stone-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d={s.icon} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Destinations */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4 tracking-wide">Destinations</h4>
              <ul className="space-y-2.5">
                {["Goa", "Kerala", "Rajasthan", "Himachal Pradesh", "Jammu & Kashmir", "Uttar Pradesh", "Mumbai"].map(d => (
                  <li key={d}>
                    <a href="#" className="text-sm hover:text-white transition-colors">{d}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4 tracking-wide">Company</h4>
              <ul className="space-y-2.5">
                {[
                  ["About Us", "/team#mission"],
                  ["How It Works", "/plan-trip"],
                  ["Our Team", "/team"],
                  ["Careers", "/team#careers"],
                  ["Press & Media", "/team"],
                  ["Partner With Us", "/team#careers"],
                  ["Sustainability", "/team#mission"],
                ].map(([label, href]) => (
                  <li key={label}><a href={href} className="text-sm hover:text-white transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4 tracking-wide">Contact Us</h4>
              <ul className="space-y-3.5">
                <li className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 mt-0.5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href="mailto:tiwarishivendra589@gmail.com" className="text-sm hover:text-white transition-colors break-all">tiwarishivendra589@gmail.com</a>
                </li>
                <li className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 mt-0.5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href="tel:+919569574750" className="text-sm hover:text-white transition-colors">+91 95695 74750</a>
                </li>
                <li className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 mt-0.5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm leading-relaxed">Connaught Place, New Delhi — 110001, India</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 mt-0.5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">Mon – Sat: 9 AM – 7 PM IST</span>
                </li>
              </ul>

              {/* Support pills */}
              <div className="mt-5 space-y-2">
                <a href="#" className="flex items-center gap-2 text-xs text-stone-400 hover:text-white transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 24/7 Travel Helpline
                </a>
                <a href="#" className="flex items-center gap-2 text-xs text-stone-400 hover:text-white transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Live Chat Support
                </a>
                <a href="#" className="flex items-center gap-2 text-xs text-stone-400 hover:text-white transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> WhatsApp: +91 95695 74750
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-stone-800">
          <div className="max-w-7xl mx-auto px-10 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-stone-500">© 2025 Journey Junction Travel Pvt. Ltd. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-5 text-xs text-stone-500">
              {["Privacy Policy", "Terms of Service", "Cookie Policy", "Refund Policy", "Sitemap"].map(l => (
                <a key={l} href="#" className="hover:text-stone-300 transition-colors">{l}</a>
              ))}
            </div>
            <p className="text-xs text-stone-600">Made with ♥ in India</p>
          </div>
        </div>
      </footer>


    </div>
  );
}
