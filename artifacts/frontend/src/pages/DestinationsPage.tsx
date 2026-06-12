import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import Navbar from "@/components/Navbar";
import ProfileDropdown from "@/components/ProfileDropdown";
import SignInModal from "@/components/SignInModal";
import LoadingState from "@/components/LoadingState";

interface DestinationSummary {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  stateSlug: string;
  country: string;
  region: string;
  heroImage: string;
  tagline: string;
  rating: number;
  reviewCount: number;
  climate: string;
  climateLabel: string;
  tags: string[];
  isCustom: boolean;
}

function WandrLogo({ className = "" }: { className?: string }) {
  return (
    <img src="/logo.png" alt="Journey Junction" className={className} />
  );
}

export default function DestinationsPage({ stateSlug }: { stateSlug?: string }) {
  const [, navigate] = useLocation();
  const [destinations, setDestinations] = useState<DestinationSummary[]>([]);
  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState(stateSlug ?? "all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [budget, setBudget] = useState("all");
  const [duration, setDuration] = useState("all");
  const [season, setSeason] = useState("all");
  const [travelType, setTravelType] = useState("all");
  const [minRating, setMinRating] = useState(0);
  const [visibleCount, setVisibleCount] = useState(12);
  const [loading, setLoading] = useState(true);
  const [signInOpen, setSignInOpen] = useState(false);

  useEffect(() => setSelectedState(stateSlug ?? "all"), [stateSlug]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<{ destinations: DestinationSummary[] }>("/destinations?limit=120");
        if (!cancelled) setDestinations(data.destinations ?? []);
      } catch {
        if (!cancelled) setDestinations([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const states = useMemo(() => {
    return Array.from(new Map(destinations.map(dest => [dest.stateSlug, { state: dest.state, stateSlug: dest.stateSlug }])).values())
      .sort((a, b) => a.state.localeCompare(b.state));
  }, [destinations]);

  const filtered = destinations.filter(dest => {
    const q = search.toLowerCase().trim();
    if (selectedState !== "all" && dest.stateSlug !== selectedState) return false;
    if (selectedRegion !== "all" && dest.region !== selectedRegion) return false;
    if (minRating > 0 && dest.rating < minRating) return false;
    if (travelType !== "all") {
      const tags = dest.tags.map(tag => tag.toLowerCase());
      const haystack = `${dest.name} ${dest.city} ${dest.state} ${dest.region} ${tags.join(" ")}`.toLowerCase();
      const matches: Record<string, string[]> = {
        beach: ["beach", "beaches", "water", "coast"],
        mountains: ["mountain", "snow", "trek", "himalaya", "meadow"],
        adventure: ["adventure", "trek", "skiing", "water sports", "rafting"],
        heritage: ["heritage", "fort", "history", "monument", "culture"],
        spiritual: ["spiritual", "pilgrimage", "temple", "yoga", "varanasi"],
        family: ["family", "city", "nature", "heritage", "beach"],
      };
      if (!matches[travelType]?.some(item => haystack.includes(item))) return false;
    }
    if (season === "summer" && !["Himachal Pradesh", "Jammu and Kashmir", "Uttarakhand"].includes(dest.state)) return false;
    if (season === "winter" && dest.climateLabel.toLowerCase().includes("alpine")) return false;
    if (budget === "budget" && dest.rating > 4.8) return false;
    if (budget === "luxury" && dest.rating < 4.7) return false;
    if (duration === "short" && dest.tags.some(tag => ["Trekking", "Skiing"].includes(tag))) return false;
    if (duration === "long" && dest.tags.some(tag => ["City"].includes(tag))) return false;
    if (q && !(dest.name.toLowerCase().includes(q) || dest.city.toLowerCase().includes(q) || dest.state.toLowerCase().includes(q) || dest.tags.some(tag => tag.toLowerCase().includes(q)))) return false;
    return true;
  });
  const visible = filtered.slice(0, visibleCount);
  const currentState = states.find(state => state.stateSlug === selectedState);

  function openDestination(dest: DestinationSummary) {
    navigate(`/destinations/${dest.stateSlug}/${dest.slug}`);
  }

  return (
    <div className="min-h-screen bg-[#f8f5f0] text-stone-800">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-2">Destinations</p>
            <h1 className="text-4xl font-extrabold text-stone-900">{currentState ? currentState.state : "All Destinations"}</h1>
            <p className="text-sm text-stone-400 mt-2 max-w-2xl">Browse published cities, temples, monuments, beaches, mountains, and attractions by state.</p>
          </div>
          <div className="relative w-full lg:w-96">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={e=>{setSearch(e.target.value);setVisibleCount(12);}} placeholder="Search destination, city, state" className="w-full pl-11 pr-4 py-3 rounded-full bg-white border border-stone-100 text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
        </section>

        <section className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={()=>{setSelectedState("all");navigate("/destinations");}} className={`px-4 py-2 rounded-full text-sm font-bold border whitespace-nowrap ${selectedState === "all" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-stone-600 border-stone-200"}`}>All states</button>
          {states.map(state => (
            <button key={state.stateSlug} onClick={()=>{setSelectedState(state.stateSlug);navigate(`/destinations/${state.stateSlug}`);}} className={`px-4 py-2 rounded-full text-sm font-bold border whitespace-nowrap ${selectedState === state.stateSlug ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-stone-600 border-stone-200"}`}>
              {state.state}
            </button>
          ))}
        </section>

        <section className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-stone-400">Advanced Filters</p>
              <p className="text-sm text-stone-500">Budget, duration, season, travel type, rating and region</p>
            </div>
            <button
              onClick={() => { setSelectedRegion("all"); setBudget("all"); setDuration("all"); setSeason("all"); setTravelType("all"); setMinRating(0); setVisibleCount(12); }}
              className="rounded-full border border-stone-200 px-3 py-2 text-xs font-bold text-stone-500 hover:text-stone-900"
            >
              Reset
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <select value={budget} onChange={e=>setBudget(e.target.value)} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-stone-600 outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="all">Any budget</option>
              <option value="budget">Budget</option>
              <option value="mid">Mid-range</option>
              <option value="luxury">Luxury</option>
            </select>
            <select value={duration} onChange={e=>setDuration(e.target.value)} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-stone-600 outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="all">Any duration</option>
              <option value="short">2-3 days</option>
              <option value="medium">4-5 days</option>
              <option value="long">6+ days</option>
            </select>
            <select value={season} onChange={e=>setSeason(e.target.value)} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-stone-600 outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="all">Any season</option>
              <option value="winter">Winter</option>
              <option value="summer">Summer</option>
            </select>
            <select value={travelType} onChange={e=>setTravelType(e.target.value)} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-stone-600 outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="all">Any travel type</option>
              <option value="beach">Beach</option>
              <option value="mountains">Mountains</option>
              <option value="adventure">Adventure</option>
              <option value="heritage">Heritage</option>
              <option value="spiritual">Spiritual</option>
              <option value="family">Family</option>
            </select>
            <select value={String(minRating)} onChange={e=>setMinRating(Number(e.target.value))} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-stone-600 outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="0">Any rating</option>
              <option value="4.5">4.5+</option>
              <option value="4.7">4.7+</option>
              <option value="4.8">4.8+</option>
            </select>
            <select value={selectedRegion} onChange={e=>setSelectedRegion(e.target.value)} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-stone-600 outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="all">Any region</option>
              {Array.from(new Set(destinations.map(dest => dest.region))).sort().map(region => <option key={region} value={region}>{region}</option>)}
            </select>
          </div>
        </section>

        {loading ? (
          <LoadingState message="Loading destinations..." />
        ) : visible.length === 0 ? (
          <div className="bg-white border border-dashed border-stone-200 rounded-3xl py-20 text-center">
            <p className="text-lg font-bold text-stone-700">No destinations found</p>
            <p className="text-sm text-stone-400 mt-1">Try another search or state filter.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map(dest => <DestinationCard key={`${dest.stateSlug}-${dest.slug}`} dest={dest} onOpen={() => openDestination(dest)} />)}
          </div>
        )}

        {visible.length < filtered.length && (
          <div className="text-center">
            <button onClick={()=>setVisibleCount(count=>count+12)} className="px-6 py-3 rounded-full bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">Load more</button>
          </div>
        )}
      </main>

      {signInOpen && <SignInModal onClose={() => setSignInOpen(false)} />}
    </div>
  );
}

function DestinationCard({ dest, onOpen }: { dest: DestinationSummary; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="group text-left rounded-3xl overflow-hidden bg-white border border-stone-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-0.5">
      <div className="relative h-56 overflow-hidden">
        <img src={dest.heroImage} alt={dest.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/90 text-indigo-700 text-[11px] font-extrabold">{dest.state}</div>
        <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs font-bold">
          <span className="text-amber-300">★</span>{dest.rating.toFixed(1)}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <h2 className="text-2xl font-extrabold text-white leading-tight">{dest.name}</h2>
          <p className="text-white/75 text-xs mt-1">{dest.city}, {dest.state}</p>
        </div>
      </div>
      <div className="p-5">
        <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed">{dest.tagline}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {dest.tags.slice(0, 4).map(tag => (
            <span key={tag} className="px-2.5 py-1 rounded-full bg-stone-50 border border-stone-100 text-[10px] font-semibold text-stone-500">{tag}</span>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between">
          <span className="text-xs text-stone-400">{dest.reviewCount.toLocaleString("en-IN")} reviews</span>
          <span className="text-xs font-bold text-indigo-600">Explore</span>
        </div>
      </div>
    </button>
  );
}
