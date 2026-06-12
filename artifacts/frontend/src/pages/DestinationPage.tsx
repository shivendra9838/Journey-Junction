import { useState, useRef, useEffect, useCallback, createContext, useContext, lazy, Suspense } from "react";
import type { ImgHTMLAttributes } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import type { DestinationData, ActivityItem, HotelItem, TransportPlanItem, MealPlanItem } from "@/data/destinations";
import { Link } from "wouter";
import { useWishlist } from "@/context/WishlistContext";
import Navbar from "@/components/Navbar";
import { useUser } from "@/context/UserContext";
import { apiFetch } from "@/lib/api";
import { coordinatesForDestination } from "@/lib/geo";
import type { Coordinates } from "@/lib/geo";
import SignInModal from "@/components/SignInModal";
import ProfileDropdown from "@/components/ProfileDropdown";
import DynamicBookingModal from "@/components/booking/DynamicBookingModal";
import LoadingState from "@/components/LoadingState";

const OpenStreetMap = lazy(() => import("../components/maps/OpenStreetMap"));

const DestCtx = createContext<DestinationData>(null!);

function WandrLogo({ className = "" }: { className?: string }) {
  return (
    <img src="/logo.png" alt="Journey Junction" className={className} />
  );
}

const FALLBACK_DESTINATION_IMAGE = "/images/unsplash-be41aa2e4372.jpg";

function SafeImage({
  src,
  alt = "",
  className = "",
  fallbackSrc = FALLBACK_DESTINATION_IMAGE,
  loading = "lazy",
  decoding = "async",
  onError,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { fallbackSrc?: string }) {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <img
      {...props}
      src={currentSrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      onError={event => {
        if (currentSrc !== fallbackSrc) setCurrentSrc(fallbackSrc);
        onError?.(event);
      }}
    />
  );
}

const destinations = {
  name: "Goa",
  country: "India",
  tagline: "Where golden shores meet endless adventure",
  rating: 4.8,
  reviews: 5241,
  heroImage:
    "/images/unsplash-be41aa2e4372.jpg",
  gallery: [
    "/images/unsplash-451710d2942a.jpg",
    "/images/unsplash-7c5d196ce843.jpg",
    "/images/unsplash-a6836391f181.jpg",
    "/images/unsplash-bb9ea81a21c3.jpg",
    "/images/unsplash-c8d3ea75cbab.jpg",
    "/images/unsplash-1925bee154dc.jpg",
  ],
  highlights: [
    { icon: "☀️", label: "Best Season", value: "Nov – Feb" },
    { icon: "🌡️", label: "Avg Temp", value: "28°C / 82°F" },
    { icon: "✈️", label: "Nearest Airport", value: "GOI — 25 min" },
    { icon: "💬", label: "Language", value: "Konkani / English" },
    { icon: "💱", label: "Currency", value: "Rupee (₹)" },
    { icon: "⏱️", label: "Ideal Stay", value: "5 – 7 Days" },
  ],
  activities: [
    {
      title: "Dolphin Watching Cruise",
      category: "Adventure",
      duration: "3 hrs",
      price: "₹899",
      image:
        "/images/unsplash-2921425bce51.jpg",
      badge: "Best Seller",
    },
    {
      title: "Spice Plantation Tour",
      category: "Culture",
      duration: "4 hrs",
      price: "₹1,299",
      image:
        "/images/unsplash-88294ae03d7b.jpg",
      badge: "Local Favourite",
    },
    {
      title: "Old Goa Heritage Walk",
      category: "History",
      duration: "3 hrs",
      price: "₹699",
      image:
        "/images/unsplash-d93f09a412f0.jpg",
      badge: "Top Rated",
    },
    {
      title: "Dudhsagar Falls Trek",
      category: "Nature",
      duration: "Full Day",
      price: "₹1,799",
      image:
        "/images/unsplash-d98d573f32bd.jpg",
      badge: null,
    },
  ],
  hotels: [
    {
      name: "Taj Exotica Resort & Spa",
      stars: 5,
      price: "₹18,000",
      perNight: "/night",
      image:
        "/images/unsplash-c98480910ba0.jpg",
      tag: "Beach Front",
    },
    {
      name: "The Leela Goa",
      stars: 5,
      price: "₹14,500",
      perNight: "/night",
      image:
        "/images/unsplash-13bd5084b599.jpg",
      tag: "Infinity Pool",
    },
    {
      name: "Novotel Goa Resort",
      stars: 4,
      price: "₹7,200",
      perNight: "/night",
      image:
        "/images/unsplash-13bd5084b599.jpg",
      tag: "Family Friendly",
    },
  ],
};

const flights = [
  {
    from: "Mumbai",
    code: "BOM",
    flag: "🇮🇳",
    airline: "IndiGo / Air India",
    duration: "1h 10m",
    frequency: "Daily",
    price: "From ₹2,499",
    direct: true,
  },
  {
    from: "Delhi",
    code: "DEL",
    flag: "🇮🇳",
    airline: "Air India / IndiGo",
    duration: "2h 15m",
    frequency: "Daily",
    price: "From ₹3,299",
    direct: true,
  },
  {
    from: "Bangalore",
    code: "BLR",
    flag: "🇮🇳",
    airline: "IndiGo / SpiceJet",
    duration: "1h 05m",
    frequency: "Daily",
    price: "From ₹1,999",
    direct: true,
  },
  {
    from: "Chennai",
    code: "MAA",
    flag: "🇮🇳",
    airline: "Air India / Akasa Air",
    duration: "1h 25m",
    frequency: "Daily",
    price: "From ₹2,199",
    direct: true,
  },
  {
    from: "Hyderabad",
    code: "HYD",
    flag: "🇮🇳",
    airline: "IndiGo / Air India",
    duration: "1h 20m",
    frequency: "Daily",
    price: "From ₹2,099",
    direct: true,
  },
];

const trains = [
  {
    from: "Mumbai CST",
    duration: "10–12 hrs",
    type: "Konkan Railway",
    operator: "Indian Railways",
    price: "From ₹450",
    icon: "🌊",
    note: "Scenic coastal route",
  },
  {
    from: "Delhi (H. Nizamuddin)",
    duration: "~26 hrs",
    type: "Goa Express",
    operator: "Indian Railways",
    price: "From ₹850",
    icon: "🌙",
    note: "Overnight sleeper berth",
  },
  {
    from: "Bangalore (Yesvantpur)",
    duration: "12–14 hrs",
    type: "Vasco Express",
    operator: "Indian Railways",
    price: "From ₹380",
    icon: "⚡",
    note: "Budget-friendly overnight",
  },
  {
    from: "Pune",
    duration: "8–9 hrs",
    type: "Mandovi Express",
    operator: "Indian Railways",
    price: "From ₹320",
    icon: "🏔️",
    note: "Scenic Ghats crossing",
  },
];

const transfers = [
  {
    type: "Pre-paid Taxi",
    desc: "Government-regulated counters at GOI arrivals — fixed fares to all beach zones, no haggling needed",
    duration: "25–45 min",
    price: "From ₹700",
    icon: "🚗",
    recommended: true,
  },
  {
    type: "App Cab (Goa Miles / Uber)",
    desc: "Book directly on your phone from the airport. Reliable and cheaper than taxis.",
    duration: "25–45 min",
    price: "From ₹450",
    icon: "📱",
    recommended: false,
  },
  {
    type: "Rented Scooter / Bike",
    desc: "The most popular way to explore Goa — available at every beach shack and rental agency",
    duration: "Self-paced",
    price: "From ₹300/day",
    icon: "🛵",
    recommended: false,
  },
  {
    type: "Kadamba Bus (KTCL)",
    desc: "State-run bus from Dabolim Airport to Panaji (Kadamba Bus Stand). Budget option.",
    duration: "45–60 min",
    price: "₹45",
    icon: "🚌",
    recommended: false,
  },
];

function GettingThereSection() {
  const dest = useContext(DestCtx);
  const { flights, trains, transfers, airportName, airportCode, mapPoints, flightIntro, flightTip, trainIntro, trainTip, transferIntro, transferTip } = dest;
  const [activeTab, setActiveTab] = useState<"flights" | "train" | "transfer">("flights");
  const coordinates = coordinatesForDestination(dest);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <div className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">Transport</div>
          <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">Getting There</h2>
        </div>
        <div className="flex w-fit max-w-full items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100">
          <span>✈️</span>
          <span className="truncate text-sm font-medium text-indigo-700">{airportName} ({airportCode})</span>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="mb-7 flex w-fit max-w-full gap-2 overflow-x-auto rounded-full bg-stone-100 p-1">
        {(["flights", "train", "transfer"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-full text-sm font-semibold capitalize transition-all ${
              activeTab === tab
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab === "flights" ? "✈️ Flights" : tab === "train" ? "🚂 Train" : "🚗 Transfers"}
          </button>
        ))}
      </div>

      {/* Flights tab */}
      {activeTab === "flights" && (
        <div className="space-y-3">
          <p className="text-sm text-stone-400 mb-5">{flightIntro}</p>
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0">
            {flights.map((f, index) => (
              <div key={`${f.code}-${index}`} className="flex w-[260px] shrink-0 snap-start gap-4 rounded-2xl bg-white border border-stone-100 shadow-sm p-5 items-start hover:shadow-md transition-shadow md:w-auto">
                <div className="w-12 h-12 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center text-2xl shrink-0">
                  {f.flag}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <div className="font-bold text-stone-900 text-sm leading-tight line-clamp-2">{f.from}</div>
                      <div className="text-xs text-stone-400">{f.code} → {airportCode}</div>
                    </div>
                    {f.direct ? (
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">Direct</span>
                    ) : (
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100">Connecting</span>
                    )}
                  </div>
                  <div className="text-xs text-stone-500 mb-2">{f.airline}</div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className="flex items-center gap-1 text-stone-500">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      {f.duration}
                    </span>
                    <span className="text-stone-400">{f.frequency}</span>
                    <span className="font-bold text-indigo-600 md:ml-auto">{f.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-start gap-3">
            <span className="text-lg mt-0.5">💡</span>
            <p className="text-xs text-indigo-700 leading-relaxed">
              <strong>Pro tip:</strong> {flightTip}
            </p>
          </div>
        </div>
      )}

      {/* Train tab */}
      {activeTab === "train" && (
        <div className="space-y-3">
          <p className="text-sm text-stone-400 mb-5">{trainIntro}</p>
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0">
            {trains.map(f => (
              <div key={f.from + f.type} className="w-[260px] shrink-0 snap-start rounded-2xl bg-white border border-stone-100 shadow-sm p-5 hover:shadow-md transition-shadow md:w-auto">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{f.icon}</span>
                    <div>
                      <div className="font-bold text-stone-900 text-sm line-clamp-2">{f.from}</div>
                      <div className="text-xs text-indigo-600 font-medium">{f.type}</div>
                    </div>
                  </div>
                  <span className="font-bold text-indigo-600 text-sm">{f.price}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-stone-400 mb-2">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    {f.duration}
                  </span>
                  <span>·</span>
                  <span>{f.operator}</span>
                </div>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-50 border border-stone-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-stone-500">{f.note}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 rounded-2xl bg-sky-50 border border-sky-100 flex items-start gap-3">
            <span className="text-lg mt-0.5">🚂</span>
            <p className="text-xs text-sky-700 leading-relaxed">
              <strong>Insider tip:</strong> {trainTip}
            </p>
          </div>
        </div>
      )}

      {/* Transfer tab */}
      {activeTab === "transfer" && (
        <div className="space-y-3">
          <p className="text-sm text-stone-400 mb-5">{transferIntro}</p>

          <div className="mb-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Suspense fallback={<div className="h-72 rounded-3xl border border-stone-100 bg-stone-100 animate-pulse" />}>
              <OpenStreetMap
                center={coordinates}
                zoom={11}
                className="h-72"
                markers={[{
                  id: dest.id,
                  title: dest.name,
                  description: `${dest.city}, ${dest.state}`,
                  latitude: coordinates.latitude,
                  longitude: coordinates.longitude,
                  tone: "destination",
                }]}
              />
            </Suspense>
            <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-sky-50 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-xl">✈️</div>
                <div>
                  <div className="text-sm font-black text-stone-900">{airportName || `${dest.city} access`}</div>
                  <div className="text-xs text-stone-500">{airportCode ? `${airportCode} Airport` : `${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`}</div>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-2">
                {mapPoints.map(r => (
                  <div key={r.to} className="flex items-center gap-2">
                    <div className={`h-0.5 flex-1 ${r.color} rounded`} />
                    <div className="text-[10px] text-stone-600 font-medium whitespace-nowrap">{r.to}</div>
                    <div className="text-[10px] text-stone-400">{r.dist} · {r.time}</div>
                  </div>
                ))}
                {mapPoints.length === 0 && <p className="text-xs leading-6 text-stone-500">OpenStreetMap is centered on {dest.name}. Pickup markers will appear during booking after the traveler selects airport, hotel, or a custom pickup.</p>}
              </div>
            </div>
          </div>

          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0">
            {transfers.map(t => (
              <div key={t.type} className={`w-[260px] shrink-0 snap-start rounded-2xl border p-5 hover:shadow-md transition-shadow md:w-auto ${t.recommended ? "bg-indigo-600 border-indigo-700 text-white" : "bg-white border-stone-100 shadow-sm"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{t.icon}</span>
                    <div>
                      <div className={`font-bold text-sm line-clamp-2 ${t.recommended ? "text-white" : "text-stone-900"}`}>{t.type}</div>
                      {t.recommended && (
                        <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Recommended</span>
                      )}
                    </div>
                  </div>
                  <span className={`font-bold text-sm ${t.recommended ? "text-indigo-200" : "text-indigo-600"}`}>{t.price}</span>
                </div>
                <p className={`text-xs leading-relaxed mb-3 ${t.recommended ? "text-indigo-200" : "text-stone-500"}`}>{t.desc}</p>
                <div className={`flex items-center gap-1 text-xs ${t.recommended ? "text-indigo-300" : "text-stone-400"}`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  {t.duration}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
            <span className="text-lg mt-0.5">🛵</span>
            <p className="text-xs text-amber-700 leading-relaxed">
              <strong>Local secret:</strong> {transferTip}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function WeatherSection() {
  const dest = useContext(DestCtx);
  const { weatherData, seasons } = dest;
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const maxRain = Math.max(...weatherData.map(d => d.rain));
  const maxTemp = 35;

  const active = activeMonth !== null ? weatherData[activeMonth] : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">Climate</div>
          <h2 className="text-3xl font-bold text-stone-900">Weather & Best Time to Visit</h2>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-sky-50 border border-sky-100">
          <span className="text-base">🌍</span>
          <span className="text-sm font-medium text-sky-700">{dest.climateLabel}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {/* Chart */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-stone-900 text-sm">Monthly Temperature & Rainfall</h3>
            <div className="flex items-center gap-4 text-xs text-stone-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> High °C
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-300 inline-block" /> Low °C
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded bg-indigo-200 inline-block" /> Rain mm
              </span>
            </div>
          </div>

          {/* Chart body */}
          <div className="relative" style={{ height: 180 }}>
            {/* Y-axis gridlines */}
            {[0, 10, 20, 30].map(t => (
              <div
                key={t}
                className="absolute inset-x-0 border-t border-stone-100 flex items-center"
                style={{ bottom: `${(t / maxTemp) * 100}%` }}
              >
                <span className="text-[9px] text-stone-300 -translate-y-2 pr-1 w-5 text-right shrink-0">{t}</span>
              </div>
            ))}

            <div className="absolute inset-x-6 bottom-0 top-0 flex items-end gap-1">
              {weatherData.map((d, i) => {
                const isActive = activeMonth === i;
                const isHovered = isActive;
                return (
                  <div
                    key={d.month}
                    className={`flex-1 flex flex-col items-center gap-0.5 cursor-pointer group relative`}
                    onMouseEnter={() => setActiveMonth(i)}
                    onMouseLeave={() => setActiveMonth(null)}
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg z-10 pointer-events-none">
                        <div className="font-bold mb-0.5">{d.month}</div>
                        <div>High: <span className="text-red-300">{d.high}°C</span></div>
                        <div>Low: <span className="text-sky-300">{d.low}°C</span></div>
                        <div>Rain: <span className="text-indigo-300">{d.rain}mm</span></div>
                        <div>Sun: <span className="text-amber-300">{d.sun}h/day</span></div>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-stone-900" />
                      </div>
                    )}

                    {/* Rainfall bar (behind temp bars) */}
                    <div className="w-full flex justify-center" style={{ height: 160 }}>
                      <div className="relative w-full flex flex-col justify-end items-center gap-0">
                        {/* Rain bar */}
                        <div
                          className={`w-full rounded-t-sm transition-all duration-200 ${isActive ? "bg-indigo-300" : "bg-indigo-100 group-hover:bg-indigo-200"}`}
                          style={{ height: `${(d.rain / maxRain) * 55}%` }}
                        />
                      </div>
                    </div>

                    {/* Temp markers overlaid */}
                    <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center" style={{ height: 160 }}>
                      {/* High dot */}
                      <div
                        className="absolute w-2 h-2 rounded-full bg-red-400 ring-2 ring-white shadow-sm"
                        style={{ bottom: `${(d.high / maxTemp) * 160}px`, transform: "translate(-50%,-50%)", left: "50%" }}
                      />
                      {/* Low dot */}
                      <div
                        className="absolute w-2 h-2 rounded-full bg-sky-300 ring-2 ring-white shadow-sm"
                        style={{ bottom: `${(d.low / maxTemp) * 160}px`, transform: "translate(-50%,-50%)", left: "50%" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Month labels */}
          <div className="flex gap-1 mt-2 px-6">
            {weatherData.map((d, i) => (
              <div
                key={d.month}
                className={`flex-1 text-center text-[10px] font-medium transition-colors ${activeMonth === i ? "text-indigo-600 font-bold" : "text-stone-400"}`}
              >
                {d.month}
              </div>
            ))}
          </div>

          {/* Active month detail strip */}
          {active && (
            <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-4 gap-3">
              {[
                { label: "High", value: `${active.high}°C`, icon: "🌡️", color: "text-red-500" },
                { label: "Low", value: `${active.low}°C`, icon: "❄️", color: "text-sky-500" },
                { label: "Rainfall", value: `${active.rain}mm`, icon: "🌧️", color: "text-indigo-500" },
                { label: "Sunshine", value: `${active.sun}h/day`, icon: "☀️", color: "text-amber-500" },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <div className="text-base mb-0.5">{stat.icon}</div>
                  <div className={`text-sm font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-[10px] text-stone-400">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Crowd meter */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 flex flex-col gap-4">
          <h3 className="font-bold text-stone-900 text-sm mb-1">Crowd Level by Month</h3>
          {weatherData.map((d, i) => (
            <div key={d.month} className="flex items-center gap-3">
              <span className={`text-[11px] font-medium w-7 ${activeMonth === i ? "text-indigo-600 font-bold" : "text-stone-400"}`}>{d.month}</span>
              <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    d.crowd <= 1 ? "bg-emerald-400" :
                    d.crowd <= 2 ? "bg-sky-400" :
                    d.crowd <= 3 ? "bg-amber-400" :
                    d.crowd <= 4 ? "bg-orange-400" : "bg-red-500"
                  }`}
                  style={{ width: `${(d.crowd / 5) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-stone-400 w-12 text-right">
                {d.crowd <= 1 ? "Quiet" : d.crowd <= 2 ? "Low" : d.crowd <= 3 ? "Moderate" : d.crowd <= 4 ? "Busy" : "Very Busy"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Season cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {seasons.map(s => (
          <div key={s.label} className={`rounded-2xl border ${s.border} ${s.bg} p-5`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${s.text}`}>{s.label}</span>
            </div>
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="font-bold text-stone-900 text-sm mb-1">{s.months}</div>
            <p className="text-[11px] text-stone-500 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StarRating({ stars }: { stars: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: stars }).map((_, i) => (
        <svg key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

const REVIEWS_DATA = [
  {
    id: "r1",
    name: "Arjun & Meera",
    location: "Bangalore, India",
    avatar: "/images/unsplash-fa221dcf17a5.jpg",
    tripType: "Couple" as const,
    date: "December 2024",
    rating: 5,
    title: "Absolute paradise for our anniversary",
    review: "We stayed at The Leela and it was beyond anything we imagined. The beach was pristine, the sunsets at Chapora Fort took our breath away, and the seafood at the beach shacks was incredible. The dolphin cruise in the morning was the highlight. Already planning our next Goa trip!",
    photos: [
      "/images/unsplash-d0f213525dcb.jpg",
      "/images/unsplash-0b3aeb85fe78.jpg",
    ],
    helpful: 189,
  },
  {
    id: "r2",
    name: "Rohan Malhotra",
    location: "Delhi, India",
    avatar: "/images/unsplash-7c7e50b42346.jpg",
    tripType: "Solo" as const,
    date: "January 2025",
    rating: 5,
    title: "Solo trip that changed my perspective",
    review: "Rented a scooter and explored every corner — from the quiet Butterfly Beach to the lively Baga strip. The spice plantation tour was a revelation, and the Portuguese heritage in Old Goa is stunning. People are warm and welcoming everywhere you go.",
    photos: [
      "/images/unsplash-62a15722b6eb.jpg",
    ],
    helpful: 134,
  },
  {
    id: "r3",
    name: "Kapoor Family",
    location: "Mumbai, India",
    avatar: "/images/unsplash-a1a40f814988.jpg",
    tripType: "Family" as const,
    date: "November 2024",
    rating: 4,
    title: "Perfect family getaway — kids loved it",
    review: "Goa in November is absolutely magical. Beaches are clean, weather is ideal, and activities for the kids are plenty. We did the Dudhsagar Falls trek and it was breathtaking. Book your beach shack tables in advance during peak season — they fill up fast!",
    photos: [
      "/images/unsplash-547267833f34.jpg",
      "/images/unsplash-41b8b7cb57fa.jpg",
    ],
    helpful: 97,
  },
  {
    id: "r4",
    name: "Sneha Iyer",
    location: "Chennai, India",
    avatar: "/images/unsplash-9dd08fa00fdd.jpg",
    tripType: "Solo" as const,
    date: "October 2024",
    rating: 5,
    title: "Post-monsoon Goa is a hidden gem",
    review: "Visited in late October and the beaches were completely empty and gorgeous. Prices were 30% lower, the greenery from the monsoon was stunning, and I had Palolem Beach almost entirely to myself at sunrise. Highly recommend visiting just after monsoon season ends.",
    photos: [],
    helpful: 243,
  },
  {
    id: "r5",
    name: "Sharma Family",
    location: "Hyderabad, India",
    avatar: "/images/unsplash-d92fed385670.jpg",
    tripType: "Family" as const,
    date: "January 2025",
    rating: 4,
    title: "Worth every rupee — truly magical",
    review: "The kids are still talking about the dolphin watching cruise and the water sports at Calangute. We stayed at Novotel and the facilities were excellent. January is busy but the atmosphere is electric. The Old Goa basilicas are a must-see for the whole family.",
    photos: [
      "/images/unsplash-338999b4082a.jpg",
    ],
    helpful: 71,
  },
  {
    id: "r6",
    name: "Priya & Vikram",
    location: "Pune, India",
    avatar: "/images/unsplash-574f2b3e20e9.jpg",
    tripType: "Couple" as const,
    date: "February 2025",
    rating: 5,
    title: "Most romantic trip we've ever taken",
    review: "Candlelit dinner on the beach, a private sunset cruise, long evenings at the beach shacks with fresh king fish curry and cold beer — Goa in February is pure magic. We took the Konkan Railway from Pune and the journey itself through the Ghats was stunning. 10/10.",
    photos: [
      "/images/unsplash-d0f213525dcb.jpg",
    ],
    helpful: 208,
  },
];

type TripFilter = "All" | "Couple" | "Solo" | "Family" | "Business";
type StarFilter = "All" | "5" | "4" | "3";
type SortMode = "helpful" | "recent";

function StarRow({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i < rating ? "fill-amber-400 text-amber-400" : "fill-stone-200 text-stone-200"}`} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

interface SubmittedReview {
  id: string; name: string; location: string; avatar: string;
  tripType: string; date: string; rating: number; title: string;
  review: string; photos: string[]; helpful: number;
  catScores: { scenery: number; accommodation: number; activities: number; value: number };
  isNew?: boolean;
}

interface ApiReview {
  id: string; userId: string; destId: string;
  authorName: string; authorAvatar: string | null;
  tripType: string; rating: number; title: string;
  review: string; photos?: string[]; helpful: number; createdAt: string;
}

function apiReviewToSubmitted(r: ApiReview, isNew = false): SubmittedReview {
  const av = initialsAvatar(r.authorName);
  return {
    id: r.id,
    name: r.authorName,
    location: "India",
    avatar: r.authorAvatar ?? `initials:${av.initials}:${av.color}`,
    tripType: r.tripType,
    date: new Date(r.createdAt).toLocaleString("en-IN", { month: "short", year: "numeric" }),
    rating: r.rating,
    title: r.title,
    review: r.review,
    photos: r.photos ?? [],
    helpful: r.helpful,
    catScores: { scenery: 0, accommodation: 0, activities: 0, value: 0 },
    isNew,
  };
}

function StarPicker({ value, onChange, size = "lg" }: { value: number; onChange: (n: number) => void; size?: "sm" | "lg" }) {
  const [hover, setHover] = useState(0);
  const sz = size === "lg" ? "w-8 h-8" : "w-5 h-5";
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-125"
        >
          <svg className={`${sz} transition-colors ${n <= (hover || value) ? "fill-amber-400 text-amber-400" : "fill-stone-200 text-stone-200"}`} viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];
const AVATAR_COLORS = [
  "bg-indigo-500","bg-sky-500","bg-emerald-500","bg-rose-500","bg-amber-500","bg-violet-500","bg-teal-500","bg-orange-500",
];

function initialsAvatar(name: string): { initials: string; color: string } {
  const parts = name.trim().split(" ").filter(Boolean);
  const initials = parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0]?.[0] ?? "?");
  const color = AVATAR_COLORS[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_COLORS.length];
  return { initials: initials.toUpperCase(), color };
}

const REVIEW_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CURRENT_YEAR = new Date().getFullYear();
const VISIT_OPTIONS = Array.from({ length: 18 }, (_, i) => {
  const d = new Date(CURRENT_YEAR, new Date().getMonth() - i, 1);
  return { value: `${REVIEW_MONTHS[d.getMonth()]} ${d.getFullYear()}`, label: `${REVIEW_MONTHS[d.getMonth()]} ${d.getFullYear()}` };
});

function WriteReviewModal({ onClose, onSubmit, defaultName = "" }: { onClose: () => void; onSubmit: (r: SubmittedReview) => void; defaultName?: string }) {
  const dest = useContext(DestCtx);
  const [step, setStep]           = useState(1);
  const [name, setName]           = useState(defaultName);
  const [location, setLocation]   = useState("");
  const [visitDate, setVisitDate] = useState(VISIT_OPTIONS[0].value);
  const [tripType, setTripType]   = useState<string>("");
  const [stars, setStars]         = useState(0);
  const [catScores, setCatScores] = useState({ scenery: 0, accommodation: 0, activities: 0, value: 0 });
  const [title, setTitle]         = useState("");
  const [body, setBody]           = useState("");
  const [photos, setPhotos]       = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const step1Valid = stars > 0 && name.trim().length > 1;
  const step2Valid = catScores.scenery > 0 && catScores.accommodation > 0 && catScores.activities > 0 && catScores.value > 0;
  const step3Valid = title.trim().length > 0 && body.trim().length > 0;

  async function submit() {
    if (!step3Valid || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const data = await apiFetch<{ review: ApiReview }>(`/destinations/${dest.id}/reviews`, {
        method: "POST",
        body: JSON.stringify({
          tripType: tripType || "Solo",
          rating: stars,
          title: title.trim(),
          review: body.trim(),
          photos,
        }),
      });
      const r = apiReviewToSubmitted(data.review, true);
      r.catScores = catScores;
      r.photos = photos;
      onSubmit(r);
      setSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const CAT_FIELDS: { key: keyof typeof catScores; label: string; icon: string }[] = [
    { key: "scenery",       label: "Scenery & Views",   icon: "🌅" },
    { key: "accommodation", label: "Accommodation",     icon: "🛏️" },
    { key: "activities",    label: "Activities",        icon: "🎯" },
    { key: "value",         label: "Value for Money",   icon: "💰" },
  ];

  function handlePhotoUpload(files: FileList | null) {
    const selected = Array.from(files ?? []).filter(file => file.type.startsWith("image/")).slice(0, 6 - photos.length);
    selected.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") setPhotos(current => [...current, result].slice(0, 6));
      };
      reader.readAsDataURL(file);
    });
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-16 px-10 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">✅</div>
            <h3 className="text-2xl font-extrabold text-stone-900">Review Published!</h3>
            <p className="text-stone-500 text-sm">Your review is now live — thank you for helping fellow travellers!</p>
            <div className="flex items-center gap-2 mt-1">
              <StarRow rating={stars} />
              <span className="text-sm font-bold text-stone-800">{STAR_LABELS[stars]}</span>
            </div>
            <button onClick={onClose} className="mt-3 px-8 py-3 rounded-full bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors">
              See My Review
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-sky-500 px-7 pt-7 pb-5 shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-1">Share Your Experience</div>
                  <h3 className="text-xl font-extrabold text-white">Write a Review</h3>
                  <p className="text-indigo-200 text-xs mt-0.5">{dest.name}, {dest.country}</p>
                </div>
                <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25 text-lg leading-none">×</button>
              </div>
              <div className="flex gap-1.5 mt-4">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`h-1 rounded-full flex-1 transition-all duration-300 ${step >= s ? "bg-white" : "bg-white/30"}`} />
                ))}
              </div>
              <div className="flex justify-between mt-1.5">
                {["Your Details", "Rate Categories", "Write Review"].map((l, i) => (
                  <span key={l} className={`text-[10px] font-semibold transition-colors ${step >= i + 1 ? "text-white" : "text-white/40"}`}>{l}</span>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="px-7 py-6 space-y-5">

                {/* ── Step 1: Your details + overall rating ── */}
                {step === 1 && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1.5">Your Name *</label>
                        <input
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="Rahul Sharma"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1.5">City / Location</label>
                        <input
                          value={location}
                          onChange={e => setLocation(e.target.value)}
                          placeholder="Mumbai, India"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1.5">When Did You Visit?</label>
                        <select
                          value={visitDate}
                          onChange={e => setVisitDate(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                        >
                          {VISIT_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1.5">Trip Type</label>
                        <div className="flex flex-wrap gap-1.5">
                          {["Solo","Couple","Family","Friends"].map(t => (
                            <button key={t} type="button"
                              onClick={() => setTripType(t)}
                              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${tripType === t ? "bg-indigo-600 border-indigo-600 text-white" : "border-stone-200 text-stone-600 hover:border-indigo-300"}`}
                            >{t}</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-2">Overall Rating *</label>
                      <div className="flex items-center gap-3">
                        <StarPicker value={stars} onChange={setStars} />
                        {stars > 0 && (
                          <span className={`text-sm font-bold ${stars >= 4 ? "text-emerald-600" : stars === 3 ? "text-amber-600" : "text-rose-600"}`}>
                            {STAR_LABELS[stars]}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => { if (step1Valid) setStep(2); }}
                      disabled={!step1Valid}
                      className={`w-full py-3 rounded-full text-sm font-bold transition-all ${step1Valid ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-stone-100 text-stone-300 cursor-not-allowed"}`}
                    >
                      Continue →
                    </button>
                  </>
                )}

                {/* ── Step 2: Category scores ── */}
                {step === 2 && (
                  <>
                    <p className="text-xs text-stone-400">Rate your experience across specific categories to help future travellers.</p>
                    <div className="space-y-4">
                      {CAT_FIELDS.map(({ key, label, icon }) => (
                        <div key={key} className="flex items-center gap-3">
                          <span className="text-xl w-7 shrink-0">{icon}</span>
                          <div className="flex-1">
                            <div className="text-xs font-semibold text-stone-700 mb-1">{label}</div>
                            <StarPicker value={catScores[key]} onChange={n => setCatScores(s => ({ ...s, [key]: n }))} size="sm" />
                          </div>
                          {catScores[key] > 0 && (
                            <span className="text-[11px] font-semibold text-stone-500 w-16 text-right shrink-0">{STAR_LABELS[catScores[key]]}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => setStep(1)} className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50">Back</button>
                      <button
                        onClick={() => { if (step2Valid) setStep(3); }}
                        disabled={!step2Valid}
                        className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${step2Valid ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-stone-100 text-stone-300 cursor-not-allowed"}`}
                      >
                        Continue →
                      </button>
                    </div>
                  </>
                )}

                {/* ── Step 3: Title, body, photos ── */}
                {step === 3 && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1.5">Review Title *</label>
                      <input
                        value={title}
                        onChange={e => setTitle(e.target.value.slice(0, 80))}
                        placeholder="Summarise your experience in one line…"
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                      <div className="text-right text-[10px] text-stone-300 mt-0.5">{title.length}/80</div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1.5">Your Review *</label>
                      <textarea
                        value={body}
                        onChange={e => setBody(e.target.value.slice(0, 500))}
                        rows={5}
                        placeholder="What did you love? Any tips for future travellers? What was the highlight of your trip?"
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                      />
                      <div className="text-right text-[10px] text-stone-300 mt-0.5">{body.length}/500</div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1.5">Photos</label>
                      <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-4 text-xs font-bold text-stone-500 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600">
                        Upload review photos
                        <input type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoUpload(e.target.files)} />
                      </label>
                      {photos.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {photos.map((photo, index) => (
                            <div key={`${photo.slice(0, 20)}-${index}`} className="relative h-16 w-16 overflow-hidden rounded-xl border border-stone-100">
                              <img src={photo} alt="" className="h-full w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setPhotos(current => current.filter((_, i) => i !== index))}
                                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick summary */}
                    <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100 space-y-2">
                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Review Preview</div>
                      <div className="flex items-center gap-2">
                        {(() => { const av = initialsAvatar(name || "?"); return (
                          <div className={`w-8 h-8 rounded-full ${av.color} flex items-center justify-center text-white text-xs font-extrabold shrink-0`}>{av.initials}</div>
                        ); })()}
                        <div>
                          <div className="text-xs font-bold text-stone-900">{name || "Your Name"}</div>
                          <div className="text-[10px] text-stone-400">{location || "India"} · {visitDate}</div>
                        </div>
                        <StarRow rating={stars} />
                      </div>
                    </div>

                    {submitError && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{submitError}</p>
                    )}
                    <div className="flex gap-3">
                      <button onClick={() => setStep(2)} disabled={submitting} className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 disabled:opacity-50">Back</button>
                      <button
                        onClick={submit}
                        disabled={!step3Valid || submitting}
                        className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 ${step3Valid && !submitting ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-stone-100 text-stone-300 cursor-not-allowed"}`}
                      >
                        {submitting ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                            Publishing…
                          </>
                        ) : "Publish Review"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Avatar component — handles both URL and initials:COLOR format ──────
function ReviewAvatar({ src, name, size = "md" }: { src: string; name: string; size?: "sm" | "md" }) {
  const sz = size === "md" ? "w-10 h-10" : "w-8 h-8";
  const txt = size === "md" ? "text-xs" : "text-[10px]";
  if (src.startsWith("initials:")) {
    const [, initials, color] = src.split(":");
    return (
      <div className={`${sz} rounded-full ${color} flex items-center justify-center text-white ${txt} font-extrabold shrink-0 ring-2 ring-white`}>
        {initials}
      </div>
    );
  }
  return <img src={src} alt={name} className={`${sz} rounded-full object-cover ring-2 ring-indigo-100 shrink-0`} />;
}

function ReviewsSection({ onSignInRequired, setActiveGallery }: { onSignInRequired: () => void; setActiveGallery: (img: string) => void }) {
  const dest = useContext(DestCtx);
  const { user } = useUser();
  const REVIEWS_DATA: SubmittedReview[] = [];
  const [apiReviews, setApiReviews] = useState<SubmittedReview[]>([]);
  const [userReviews, setUserReviews] = useState<SubmittedReview[]>([]);
  const [tripFilter, setTripFilter] = useState<TripFilter>("All");
  const [starFilter, setStarFilter] = useState<StarFilter>("All");
  const [sortMode, setSortMode] = useState<SortMode>("helpful");
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, number>>({});
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [writeOpen, setWriteOpen] = useState(false);

  useEffect(() => {
    apiFetch<{ reviews: ApiReview[] }>(`/destinations/${dest.id}/reviews`)
      .then(data => setApiReviews(data.reviews.map(r => apiReviewToSubmitted(r))))
      .catch(() => {});
  }, [dest.id]);

  function handleSubmitReview(r: SubmittedReview) {
    setUserReviews(prev => [r, ...prev]);
    setSortMode("recent");
  }

  async function voteHelpful(id: string, base: number) {
    if (votedIds.has(id)) return;
    setHelpfulVotes(v => ({ ...v, [id]: (v[id] ?? base) + 1 }));
    setVotedIds(prev => new Set([...prev, id]));
    if (id.includes("-")) {
      try {
        await apiFetch(`/destinations/${dest.id}/reviews/${id}/helpful`, { method: "POST" });
      } catch {
        // silently ignore
      }
    }
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Combine all reviews for counts
  const allReviews = [...userReviews, ...apiReviews, ...REVIEWS_DATA];
  const totalCount = allReviews.length;
  const avgRating  = totalCount > 0
    ? Math.round((allReviews.reduce((s, r) => s + r.rating, 0) / totalCount) * 10) / 10
    : dest.rating;

  const starCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  allReviews.forEach(r => { starCounts[r.rating] = (starCounts[r.rating] ?? 0) + 1; });

  // Category averages — include user-submitted catScores
  const BASE_CAT = { scenery: 5.0, accommodation: 4.8, activities: 4.7, value: 4.6 };
  const catAvg = allReviews.length === 0 ? BASE_CAT : (() => {
    const sums = { scenery: 0, accommodation: 0, activities: 0, value: 0 };
    let catCount = 0;
    allReviews.forEach(r => {
      if (r.catScores) {
        sums.scenery       += r.catScores.scenery;
        sums.accommodation += r.catScores.accommodation;
        sums.activities    += r.catScores.activities;
        sums.value         += r.catScores.value;
        catCount++;
      }
    });
    if (catCount === 0) return BASE_CAT;
    return {
      scenery:       Math.round((sums.scenery / catCount) * 10) / 10,
      accommodation: Math.round((sums.accommodation / catCount) * 10) / 10,
      activities:    Math.round((sums.activities / catCount) * 10) / 10,
      value:         Math.round((sums.value / catCount) * 10) / 10,
    };
  })();

  // Merged & filtered list
  type AnyReview = (typeof REVIEWS_DATA[0]) | SubmittedReview;
  const merged: AnyReview[] = [
    ...userReviews,
    ...apiReviews,
    ...REVIEWS_DATA,
  ];

  const filtered = merged
    .filter(r => tripFilter === "All" || r.tripType === tripFilter)
    .filter(r => starFilter === "All" || r.rating === Number(starFilter))
    .sort((a, b) => {
      if (sortMode === "recent") return 0; // user reviews already prepended
      return (helpfulVotes[b.id] ?? b.helpful) - (helpfulVotes[a.id] ?? a.helpful);
    });

  const tripBadgeColor: Record<string, string> = {
    Solo:     "bg-sky-50 text-sky-700 border-sky-100",
    Couple:   "bg-rose-50 text-rose-700 border-rose-100",
    Family:   "bg-emerald-50 text-emerald-700 border-emerald-100",
    Business: "bg-amber-50 text-amber-700 border-amber-100",
    Friends:  "bg-violet-50 text-violet-700 border-violet-100",
  };

  const COMMUNITY_PHOTOS = allReviews.flatMap(r => r.photos).filter(Boolean).slice(0, 16);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">Traveller Reviews</div>
          <h2 className="text-3xl font-bold text-stone-900">What People Are Saying</h2>
          {userReviews.length > 0 && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {userReviews.length} new review{userReviews.length > 1 ? "s" : ""} just posted
            </div>
          )}
        </div>
        <button
          onClick={() => { if (!user) { onSignInRequired(); return; } setWriteOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-indigo-200 text-indigo-600 text-sm font-semibold hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          Write a Review
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Overall score */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 flex items-center gap-6">
          <div className="text-center shrink-0">
            <div className="text-6xl font-extrabold text-stone-900 leading-none transition-all">{avgRating.toFixed(1)}</div>
            <StarRow rating={Math.round(avgRating)} />
            <div className="text-xs text-stone-400 mt-1">{totalCount.toLocaleString("en-IN")} reviews</div>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map(n => {
              const count = starCounts[n] ?? 0;
              const pct   = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
              return (
                <div key={n} className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-500 w-4 text-right shrink-0">{n}</span>
                  <svg className="w-3 h-3 fill-amber-400 shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  <div className="flex-1 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300 transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-stone-400 w-5 shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category scores */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <div className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Scores by Category</div>
          <div className="space-y-3">
            {[
              { label: "Scenery & Views", score: catAvg.scenery,       icon: "🌅" },
              { label: "Accommodation",   score: catAvg.accommodation, icon: "🛏️" },
              { label: "Activities",      score: catAvg.activities,    icon: "🎯" },
              { label: "Value for Money", score: catAvg.value,         icon: "💰" },
            ].map(({ label, score, icon }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-base w-5 shrink-0">{icon}</span>
                <span className="text-xs text-stone-600 w-32 shrink-0">{label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-700" style={{ width: `${(score / 5) * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-stone-900 w-6 text-right">{score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter & sort bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-1 bg-stone-100 rounded-full p-1">
          {(["All", "Couple", "Solo", "Family", "Friends", "Business"] as TripFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setTripFilter(f as TripFilter)}
              className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${tripFilter === f ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-stone-100 rounded-full p-1">
          {(["All", "5", "4", "3"] as StarFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStarFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-0.5 ${starFilter === s ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
            >
              {s === "All" ? "All Stars" : <><span>{s}</span><svg className="w-2.5 h-2.5 fill-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg></>}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1 text-xs text-stone-500">
          <span>Sort:</span>
          <button onClick={() => setSortMode("helpful")} className={`font-semibold transition-colors ${sortMode === "helpful" ? "text-indigo-600" : "hover:text-stone-700"}`}>Most Helpful</button>
          <span>·</span>
          <button onClick={() => setSortMode("recent")} className={`font-semibold transition-colors ${sortMode === "recent" ? "text-indigo-600" : "hover:text-stone-700"}`}>Most Recent</button>
        </div>

        <span className="text-xs text-stone-400">{filtered.length} review{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Review cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-medium">No reviews match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {filtered.map(r => {
            const isExpanded   = expandedIds.has(r.id);
            const helpfulCount = helpfulVotes[r.id] ?? r.helpful;
            const hasVoted     = votedIds.has(r.id);
            const isLong       = r.review.length > 180;
            const isUserNew    = "isNew" in r && r.isNew;
            return (
              <div key={r.id} className={`rounded-2xl bg-white border shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow ${isUserNew ? "border-indigo-200 ring-2 ring-indigo-100" : "border-stone-100"}`}>

                {/* "Just Posted" banner for new user reviews */}
                {isUserNew && (
                  <div className="flex items-center gap-1.5 -mt-1 mb-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      Just Posted
                    </span>
                  </div>
                )}

                {/* Reviewer row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <ReviewAvatar src={r.avatar} name={r.name} />
                    <div>
                      <div className="font-semibold text-stone-900 text-sm leading-tight">{r.name}</div>
                      <div className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        {r.location}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StarRow rating={r.rating} />
                    <span className="text-[10px] text-stone-400">{r.date}</span>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${tripBadgeColor[r.tripType] ?? "bg-stone-50 text-stone-600 border-stone-100"}`}>
                    {r.tripType}
                  </span>
                  {isUserNew ? (
                    <span className="flex items-center gap-1 text-[10px] text-indigo-600 font-medium">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                      Community review
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      Verified booking
                    </span>
                  )}
                </div>

                {/* Category mini-scores for user reviews */}
                {"catScores" in r && r.catScores && (
                  <div className="grid grid-cols-4 gap-2 bg-stone-50 rounded-xl p-3 border border-stone-100">
                    {[
                      { icon: "🌅", key: "scenery" as const,       label: "Scenery" },
                      { icon: "🛏️", key: "accommodation" as const, label: "Stay" },
                      { icon: "🎯", key: "activities" as const,    label: "Activities" },
                      { icon: "💰", key: "value" as const,         label: "Value" },
                    ].map(({ icon, key, label }) => (
                      <div key={key} className="text-center">
                        <div className="text-sm">{icon}</div>
                        <div className="text-[10px] font-bold text-stone-700">{r.catScores[key]}.0</div>
                        <div className="text-[9px] text-stone-400">{label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Review text */}
                <div>
                  <div className="font-bold text-stone-900 text-sm mb-1.5">"{r.title}"</div>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    {isLong && !isExpanded ? `${r.review.slice(0, 180)}…` : r.review}
                  </p>
                  {isLong && (
                    <button onClick={() => toggleExpand(r.id)} className="text-[11px] font-semibold text-indigo-500 hover:text-indigo-700 mt-1 transition-colors">
                      {isExpanded ? "Show less" : "Read more"}
                    </button>
                  )}
                </div>

                {/* Photos */}
                {r.photos.length > 0 && (
                  <div className="flex gap-2">
                    {r.photos.map((p, pi) => (
                      <div key={pi} className="w-16 h-16 rounded-xl overflow-hidden shrink-0 ring-1 ring-stone-100">
                        <img src={p} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Helpful */}
                <div className="flex items-center justify-between pt-3 border-t border-stone-100 mt-auto">
                  <span className="text-[10px] text-stone-400">{helpfulCount} found this helpful</span>
                  <button
                    onClick={() => voteHelpful(r.id, r.helpful)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                      hasVoted
                        ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                        : "border-stone-200 text-stone-500 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50"
                    }`}
                  >
                    <svg className={`w-3 h-3 ${hasVoted ? "fill-indigo-500" : "fill-none"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905a3.61 3.61 0 01-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>
                    </svg>
                    {hasVoted ? "Helpful ✓" : "Helpful"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Community photo wall */}
      <div className="mt-2 mb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-bold text-stone-700">Community Photos <span className="text-stone-400 font-normal">({COMMUNITY_PHOTOS.length * 47}+ uploaded)</span></div>
          <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">View all</button>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5 rounded-2xl overflow-hidden">
          {COMMUNITY_PHOTOS.map((p, i) => (
            <div key={i} className="aspect-square overflow-hidden rounded-xl" onClick={() => setActiveGallery(p)}>
              <img src={p} alt="" className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer duration-300" />
            </div>
          ))}
        </div>
      </div>

      {/* Write-review modal */}
      {writeOpen && (
        <WriteReviewModal
          onClose={() => setWriteOpen(false)}
          onSubmit={r => { handleSubmitReview(r); setWriteOpen(false); }}
          defaultName={user?.name ?? ""}
        />
      )}
    </div>
  );
}

type ItineraryItem = {
  id: string;
  name: string;
  type: "activity" | "hotel" | "transport";
  duration: string;
  price: number;
  emoji: string;
};

type DayPlan = { day: number; label: string; items: ItineraryItem[] };

const DAYS_LABELS = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];

function ItineraryPanel({ onClose }: { onClose: () => void }) {
  const dest = useContext(DestCtx);
  const QUICK_ADDS = dest.quickAdds;
  const initDays: DayPlan[] = DAYS_LABELS.map((label, i) => ({ day: i + 1, label, items: [] }));
  const [days, setDays] = useState<DayPlan[]>(initDays);
  const [activeDay, setActiveDay] = useState(0);
  const [filterType, setFilterType] = useState<"all" | "activity" | "hotel" | "transport">("all");
  const [dragOver, setDragOver] = useState(false);

  const totalCost = days.reduce((sum, d) => sum + d.items.reduce((s, i) => s + i.price, 0), 0);
  const totalItems = days.reduce((sum, d) => sum + d.items.length, 0);

  function addItem(item: ItineraryItem) {
    setDays(prev => prev.map((d, i) =>
      i === activeDay ? { ...d, items: [...d.items, { ...item, id: item.id + Date.now() }] } : d
    ));
  }

  function removeItem(dayIdx: number, itemId: string) {
    setDays(prev => prev.map((d, i) =>
      i === dayIdx ? { ...d, items: d.items.filter(it => it.id !== itemId) } : d
    ));
  }

  function clearDay(dayIdx: number) {
    setDays(prev => prev.map((d, i) => i === dayIdx ? { ...d, items: [] } : d));
  }

  const filtered = QUICK_ADDS.filter(i => filterType === "all" || i.type === filterType);

  const typeColor: Record<string, string> = {
    activity: "bg-indigo-50 text-indigo-700 border-indigo-100",
    hotel: "bg-amber-50 text-amber-700 border-amber-100",
    transport: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };

  return (
    <div className="fixed inset-0 z-[105] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl bg-[#f8f5f0] h-full flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-sky-500 px-6 pt-8 pb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-1">Itinerary Builder</div>
              <h2 className="text-2xl font-extrabold text-white">Plan My Trip</h2>
              <p className="text-indigo-200 text-xs mt-1">{dest.name}, {dest.country} · 5 Days</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25 transition-colors text-lg"
            >×</button>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Days", value: "5", icon: "📅" },
              { label: "Activities", value: String(totalItems), icon: "🎯" },
              { label: "Est. Cost", value: `₹${totalCost.toLocaleString()}`, icon: "💰" },
            ].map(s => (
              <div key={s.label} className="bg-white/15 rounded-xl px-3 py-2.5 text-center">
                <div className="text-base mb-0.5">{s.icon}</div>
                <div className="text-white font-bold text-sm">{s.value}</div>
                <div className="text-indigo-200 text-[10px]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Day tabs */}
        <div className="bg-white border-b border-stone-100 px-4 py-2 flex gap-1 overflow-x-auto">
          {days.map((d, i) => (
            <button
              key={i}
              onClick={() => setActiveDay(i)}
              className={`relative shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeDay === i
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-stone-500 hover:bg-stone-100"
              }`}
            >
              {d.label}
              {d.items.length > 0 && (
                <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${activeDay === i ? "bg-white text-indigo-600" : "bg-indigo-600 text-white"}`}>
                  {d.items.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Active day schedule */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-stone-900 text-sm">{days[activeDay].label} Schedule</h3>
              {days[activeDay].items.length > 0 && (
                <button
                  onClick={() => clearDay(activeDay)}
                  className="text-[10px] text-stone-400 hover:text-red-500 transition-colors font-medium"
                >
                  Clear day
                </button>
              )}
            </div>

            {days[activeDay].items.length === 0 ? (
              <div
                className={`rounded-2xl border-2 border-dashed transition-colors py-12 flex flex-col items-center gap-2 ${
                  dragOver ? "border-indigo-400 bg-indigo-50" : "border-stone-200 bg-stone-50/50"
                }`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
              >
                <span className="text-3xl">🗓️</span>
                <p className="text-sm font-medium text-stone-400">No activities yet</p>
                <p className="text-xs text-stone-300">Tap items below to add to {days[activeDay].label}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {days[activeDay].items.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-stone-100 shadow-sm group">
                    <div className="w-7 h-7 rounded-lg bg-stone-50 flex items-center justify-center text-base shrink-0">{item.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-stone-900 truncate">{item.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border capitalize ${typeColor[item.type]}`}>{item.type}</span>
                        <span className="text-[10px] text-stone-400">{item.duration}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-indigo-600">${item.price}</div>
                    </div>
                    <button
                      onClick={() => removeItem(activeDay, item.id)}
                      className="w-5 h-5 rounded-full text-stone-300 hover:text-red-400 hover:bg-red-50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 text-sm shrink-0"
                    >×</button>
                  </div>
                ))}

                {/* Day subtotal */}
                <div className="flex items-center justify-between pt-2 mt-1 border-t border-stone-200">
                  <span className="text-xs text-stone-400 font-medium">{days[activeDay].label} total</span>
                  <span className="text-sm font-bold text-stone-900">
                    ${days[activeDay].items.reduce((s, i) => s + i.price, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Add items panel */}
          <div className="border-t border-stone-200 bg-white px-5 pt-4 pb-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-stone-700">Add to {days[activeDay].label}</span>
              <div className="flex gap-1">
                {(["all", "activity", "hotel", "transport"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterType(f)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize transition-all ${
                      filterType === f ? "bg-indigo-600 text-white" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
              {filtered.map(item => (
                <button
                  key={item.id}
                  onClick={() => addItem(item)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-50 border border-stone-100 hover:bg-indigo-50 hover:border-indigo-200 transition-all text-left group"
                >
                  <span className="text-base shrink-0">{item.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-stone-800 leading-tight truncate">{item.name}</div>
                    <div className="text-[10px] text-indigo-600 font-bold mt-0.5">${item.price}</div>
                  </div>
                  <svg className="w-3.5 h-3.5 text-stone-300 group-hover:text-indigo-500 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                  </svg>
                </button>
              ))}
            </div>

            {/* Book itinerary CTA */}
            <button className="mt-4 w-full py-3 rounded-full bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              Book This Itinerary · ${totalCost.toLocaleString()} est.
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareModal({ onClose }: { onClose: () => void }) {
  const dest = useContext(DestCtx);
  const [copied, setCopied] = useState(false);
  const link = `https://wandr.co/destinations/${dest.id}`;

  function copy() {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const channels = [
    { label: "WhatsApp", icon: "💬", color: "bg-emerald-500 hover:bg-emerald-600", href: "#" },
    { label: "Twitter / X", icon: "𝕏", color: "bg-stone-900 hover:bg-stone-700", href: "#" },
    { label: "Facebook", icon: "f", color: "bg-blue-600 hover:bg-blue-700", href: "#" },
    { label: "Email", icon: "✉️", color: "bg-indigo-500 hover:bg-indigo-600", href: "#" },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-7 z-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-stone-900">Share {dest.name}</h3>
            <p className="text-xs text-stone-400 mt-0.5">Send this destination to a friend</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center hover:bg-stone-200 transition-colors text-lg leading-none"
          >×</button>
        </div>

        {/* Preview card */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-100 mb-6">
          <SafeImage
            src={dest.heroImage}
            alt={dest.name}
            className="w-14 h-14 rounded-xl object-cover shrink-0"
          />
          <div className="min-w-0">
            <div className="font-bold text-stone-900 text-sm">{dest.name}, {dest.country}</div>
            <div className="text-xs text-stone-400 truncate">{link}</div>
            <div className="flex items-center gap-1 mt-1">
              {[1,2,3,4,5].map(i => (
                <svg key={i} className="w-3 h-3 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              ))}
              <span className="text-xs text-stone-400 ml-1">{dest.rating} · {dest.reviews.toLocaleString()} reviews</span>
            </div>
          </div>
        </div>

        {/* Social buttons */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {channels.map(c => (
            <a
              key={c.label}
              href={c.href}
              className={`flex flex-col items-center gap-2 py-3 rounded-2xl text-white transition-colors ${c.color}`}
            >
              <span className="text-lg leading-none font-bold">{c.icon}</span>
              <span className="text-[10px] font-medium">{c.label}</span>
            </a>
          ))}
        </div>

        {/* Copy link */}
        <div className="flex items-center gap-2 p-2 pl-4 rounded-full bg-stone-50 border border-stone-200">
          <span className="text-xs text-stone-500 truncate flex-1">{link}</span>
          <button
            onClick={copy}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              copied
                ? "bg-emerald-500 text-white"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {copied ? "✓ Copied!" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}

const ACTIVITY_INFO: Record<string, { emoji: string; includes: string[]; highlights: string[] }> = {
  Adventure: {
    emoji: "🏄",
    includes: ["Experienced certified guide", "All safety equipment", "Transport to & from site", "Refreshments & water"],
    highlights: ["Suitable for all skill levels", "Small group (max 12)", "Free cancellation 24hrs prior", "Instant booking confirmation"],
  },
  Culture: {
    emoji: "🎭",
    includes: ["Expert local cultural guide", "Entry fees & permits", "Tasting / sampling session", "Photo opportunities"],
    highlights: ["Authentic local experience", "Interpreter available", "Wheelchair accessible", "Family friendly"],
  },
  History: {
    emoji: "🏛️",
    includes: ["Historian-certified guide", "Entry tickets included", "Printed itinerary map", "Audio guide device"],
    highlights: ["UNESCO heritage sites", "Exclusive access areas", "Live commentary", "Questions welcome"],
  },
  Nature: {
    emoji: "🌿",
    includes: ["Naturalist guide", "Trekking equipment", "Packed lunch & snacks", "First-aid support kit"],
    highlights: ["Off-the-beaten-path routes", "Wildlife spotting", "Photography stops", "Eco-certified operator"],
  },
  Spiritual: {
    emoji: "🕯️",
    includes: ["Ceremony / ritual access", "Guided mindfulness session", "Cultural briefing booklet", "Local monk / priest guide"],
    highlights: ["Sunrise or sunset timing", "Sacred site access", "Respectful small groups", "Deep cultural immersion"],
  },
  Scenic: {
    emoji: "🎿",
    includes: ["Expert instructor", "Full safety gear", "Warm beverages & snacks", "Scenic route map"],
    highlights: ["Panoramic viewpoints", "Best photography spots", "Flexible pace", "All fitness levels"],
  },
  Wildlife: {
    emoji: "🐘",
    includes: ["Experienced naturalist", "Jeep / boat transport", "Binoculars provided", "Entry permits & fees"],
    highlights: ["Small group safaris", "Dawn & dusk departures", "Species checklist", "Conservation certified"],
  },
};

function ActivityModal({ act, onClose, onBook }: { act: ActivityItem; onClose: () => void; onBook: () => void }) {
  const dest = useContext(DestCtx);
  const { isActivitySaved, toggleActivity } = useWishlist();
  const info = ACTIVITY_INFO[act.category] ?? ACTIVITY_INFO.Adventure;

  const aboutMap: Record<string, string> = {
    Adventure: `Dive into the thrill of ${act.title} with expert local guides who know every wave, trail, and current. This ${act.duration} experience is crafted for all levels — from first-timers to seasoned adventurers.`,
    Culture: `Step inside the living culture of ${dest.name} with ${act.title}. Over ${act.duration}, you'll share spaces, stories, and flavours with locals who carry centuries of tradition.`,
    History: `Uncover the layered past of ${dest.name} through ${act.title}. Walk with a certified historian for ${act.duration} and let ancient stones and forgotten lanes tell their stories.`,
    Nature: `Lose yourself in the wild beauty of ${dest.name} on ${act.title}. This ${act.duration} journey takes you through landscapes that most visitors never see.`,
    Spiritual: `Connect with the soul of ${dest.name} on ${act.title}. In ${act.duration} you will witness rituals, silences, and light that stay with you long after the journey ends.`,
    Scenic: `Take in the breathtaking scenery of ${dest.name} on ${act.title}. A ${act.duration} experience with unforgettable panoramas at every turn.`,
    Wildlife: `Get close to the magnificent wildlife of ${dest.name} on ${act.title}. ${act.duration} in pristine wilderness with expert naturalists who read the land like a map.`,
  };

  const about = aboutMap[act.category] ?? aboutMap.Adventure;

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg overflow-hidden z-10 max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Hero image */}
        <div className="relative h-56 overflow-hidden shrink-0">
          <SafeImage src={act.image} alt={act.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors text-xl leading-none"
          >
            ×
          </button>
          {act.badge && (
            <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/90 text-[10px] font-bold text-stone-700 shadow-sm">
              {act.badge}
            </div>
          )}
          <div className="absolute bottom-4 left-4 right-12">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-600/80 backdrop-blur-sm mb-2">
              <span className="text-xs">{info.emoji}</span>
              <span className="text-[10px] font-bold text-white uppercase tracking-wide">{act.category}</span>
            </div>
            <h2 className="text-xl font-extrabold text-white leading-tight">{act.title}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-stone-50 rounded-2xl p-3.5 text-center">
              <div className="text-lg mb-1">⏱️</div>
              <div className="text-[10px] text-stone-400 uppercase tracking-wide mb-0.5">Duration</div>
              <div className="font-bold text-stone-900 text-sm">{act.duration}</div>
            </div>
            <div className="bg-indigo-50 rounded-2xl p-3.5 text-center">
              <div className="text-lg mb-1">💰</div>
              <div className="text-[10px] text-stone-400 uppercase tracking-wide mb-0.5">Price</div>
              <div className="font-bold text-indigo-600 text-sm">From {act.price}</div>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-3.5 text-center">
              <div className="text-lg mb-1">👥</div>
              <div className="text-[10px] text-stone-400 uppercase tracking-wide mb-0.5">Group</div>
              <div className="font-bold text-stone-900 text-sm">Max 12</div>
            </div>
          </div>

          {/* About */}
          <div className="mb-5">
            <h3 className="font-bold text-stone-900 text-sm mb-2">About This Experience</h3>
            <p className="text-sm text-stone-500 leading-relaxed">{about}</p>
          </div>

          {/* Highlights */}
          <div className="mb-5">
            <h3 className="font-bold text-stone-900 text-sm mb-3">Highlights</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {info.highlights.map(h => (
                <div key={h} className="flex items-center gap-2 bg-stone-50 rounded-xl px-3 py-2">
                  <span className="text-indigo-500 text-xs font-bold shrink-0">✦</span>
                  <span className="text-xs text-stone-600 leading-snug">{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* What's included */}
          <div className="mb-6">
            <h3 className="font-bold text-stone-900 text-sm mb-3">What's Included</h3>
            <div className="space-y-2">
              {info.includes.map(item => (
                <div key={item} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                  <span className="text-sm text-stone-600">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex gap-3 sticky bottom-0 bg-white pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-full border border-stone-200 text-stone-600 text-sm font-semibold hover:bg-stone-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => toggleActivity(dest.id, dest.name, act)}
              className={`w-12 rounded-full border text-sm font-semibold transition-all flex items-center justify-center shrink-0 ${
                isActivitySaved(dest.id, act.title)
                  ? "border-rose-300 bg-rose-50 text-rose-500"
                  : "border-stone-200 text-stone-400 hover:border-rose-300 hover:text-rose-400"
              }`}
            >
              <svg className={`w-4 h-4 ${isActivitySaved(dest.id, act.title) ? "fill-rose-500" : "fill-none"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
            </button>
            <button onClick={onBook} className="flex-1 py-3.5 rounded-full bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200">
              Book Now · {act.price}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StarRatingLarge({ stars }: { stars: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} className={`w-4 h-4 ${i <= stars ? "text-amber-400" : "text-stone-200"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}
function PaymentGatewayOverlay({
  amount,
  method,
  travellerName,
  destinationName,
  processing,
  onClose,
  onPay,
}: {
  amount: number;
  method: string;
  travellerName: string;
  destinationName: string;
  processing: boolean;
  onClose: () => void;
  onPay: () => void;
}) {
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [bank, setBank] = useState("HDFC Bank");
  const isUpi = method.toLowerCase().includes("upi");
  const isCard = method.toLowerCase().includes("card");
  const isWallet = method.toLowerCase().includes("wallet");
  const canPay = isCard
    ? cardNumber.replace(/\D/g, "").length >= 12
    : isUpi
    ? upiId.includes("@")
    : Boolean(bank);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-stone-950/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-indigo-600 to-sky-500 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">Secure Payment Gateway</p>
              <h3 className="mt-1 text-2xl font-black">Pay {formatINR(amount)}</h3>
              <p className="mt-1 text-sm text-white/75">{destinationName} · {travellerName || "Traveller"}</p>
            </div>
            <button disabled={processing} onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xl hover:bg-white/25 disabled:opacity-50">×</button>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-stone-400">Selected method</p>
            <p className="mt-1 text-lg font-black text-stone-950">{method}</p>
          </div>

          {isCard && (
            <div>
              <label className="text-xs font-black uppercase tracking-wide text-stone-400">Card number</label>
              <input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="4242 4242 4242 4242" inputMode="numeric" className="mt-2 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <input placeholder="MM/YY" className="rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
                <input placeholder="CVV" inputMode="numeric" className="rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            </div>
          )}

          {isUpi && (
            <div>
              <label className="text-xs font-black uppercase tracking-wide text-stone-400">UPI ID</label>
              <input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="name@upi" className="mt-2 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          )}

          {!isCard && !isUpi && (
            <div>
              <label className="text-xs font-black uppercase tracking-wide text-stone-400">{isWallet ? "Wallet" : "Bank"}</label>
              <select value={bank} onChange={e => setBank(e.target.value)} className="mt-2 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-300">
                <option>HDFC Bank</option>
                <option>ICICI Bank</option>
                <option>SBI</option>
                <option>PhonePe Wallet</option>
                <option>Paytm Wallet</option>
              </select>
            </div>
          )}

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-semibold leading-6 text-emerald-700">
            This demo gateway blocks booking confirmation until payment completes. Connect Stripe Elements here for live card authorization.
          </div>

          <button
            onClick={onPay}
            disabled={!canPay || processing}
            className="flex w-full items-center justify-center rounded-full bg-emerald-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing ? "Processing payment..." : `Pay ${formatINR(amount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function HotelModal({ hotel, onClose, startDate, endDate, adults }: {
  hotel: HotelItem; onClose: () => void;
  startDate: string; endDate: string; adults: number;
}) {
  const dest = useContext(DestCtx);
  const { isHotelSaved, toggleHotel } = useWishlist();

  const [checkIn, setCheckIn] = useState(startDate);
  const [checkOut, setCheckOut] = useState(endDate);
  const [guests, setGuests] = useState(adults);
  const [roomType, setRoomType] = useState(0);
  const [booked, setBooked] = useState(false);
  const [dateError, setDateError] = useState("");

  const roomTypes = hotel.stars === 5
    ? [
        { name: "Deluxe Room", size: "42 m²", beds: "1 King Bed", extra: "City / Garden View" },
        { name: "Premier Suite", size: "72 m²", beds: "1 King Bed", extra: "Private Balcony" },
        { name: "Grand Suite", size: "120 m²", beds: "1 King + Living Area", extra: "Panoramic View" },
      ]
    : [
        { name: "Superior Room", size: "32 m²", beds: "1 Queen Bed", extra: "Garden View" },
        { name: "Deluxe Room", size: "44 m²", beds: "1 King Bed", extra: "Scenic View" },
        { name: "Junior Suite", size: "65 m²", beds: "1 King + Sofa", extra: "Private Balcony" },
      ];

  const amenityGroups = [
    {
      label: "Room",
      items: ["Free high-speed WiFi", "Air conditioning", "Flat-screen TV", "Mini bar", "In-room safe", "24hr room service"],
    },
    {
      label: "Facilities",
      items: hotel.stars === 5
        ? ["Spa & wellness centre", "Infinity / outdoor pool", "Fitness centre", "Fine dining restaurant", "Butler service", "Concierge desk"]
        : ["Swimming pool", "Fitness centre", "Restaurant & café", "Luggage storage", "Tour desk", "Parking"],
    },
    {
      label: "Extras",
      items: hotel.tag.toLowerCase().includes("beach") || hotel.tag.toLowerCase().includes("front")
        ? ["Private beach access", "Watersports equipment", "Sun loungers & umbrellas", "Beachside dining"]
        : hotel.tag.toLowerCase().includes("pool")
        ? ["Infinity pool with views", "Poolside bar", "Pool butler", "Evening poolside dining"]
        : hotel.tag.toLowerCase().includes("heritage") || hotel.tag.toLowerCase().includes("palace")
        ? ["Heritage property tours", "Cultural evenings", "Royal dining experience", "Vintage décor rooms"]
        : ["Airport transfers", "City tour desk", "Business centre", "Kids' club"],
    },
  ];

  function nightsBetween(a: string, b: string) {
    const d1 = new Date(a), d2 = new Date(b);
    const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000);
    return diff > 0 ? diff : 1;
  }

  const nights = nightsBetween(checkIn, checkOut);
  const basePrice = parseInt(hotel.price.replace(/[^\d]/g, ""), 10) || 0;
  const roomMultiplier = [1, 1.4, 1.9][roomType] ?? 1;
  const total = Math.round(basePrice * roomMultiplier * nights);
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  function handleHotelCheckIn(value: string) {
    const today = dateOffset(0);
    if (value < today) {
      setDateError("Previous dates are not allowed.");
      setCheckIn(today);
      if (checkOut <= today) setCheckOut(nextDate(today));
      return;
    }
    setCheckIn(value);
    if (checkOut <= value) {
      setDateError("Check-Out date must be after Check-In date.");
      setCheckOut(nextDate(value));
      return;
    }
    setDateError("");
  }

  function handleHotelCheckOut(value: string) {
    const error = validateBookingDates(checkIn, value);
    if (error) {
      setDateError(error);
      setCheckOut(nextDate(checkIn));
      return;
    }
    setDateError("");
    setCheckOut(value);
  }

  function reserveHotel() {
    const error = validateBookingDates(checkIn, checkOut);
    if (error) {
      setDateError(error);
      return;
    }
    setDateError("");
    setBooked(true);
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl overflow-hidden z-10 max-h-[94vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Hero */}
        <div className="relative h-52 shrink-0 overflow-hidden">
          <SafeImage src={hotel.image} alt={hotel.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors text-xl leading-none"
          >×</button>
          <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-white/90 text-[10px] font-bold text-stone-700 shadow-sm">
            {hotel.tag}
          </div>
          <div className="absolute bottom-4 left-4 right-12">
            <StarRatingLarge stars={hotel.stars} />
            <h2 className="text-xl font-extrabold text-white mt-1 leading-tight">{hotel.name}</h2>
            <p className="text-white/70 text-xs mt-0.5">{dest.name}, {dest.state}</p>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          <div className="p-6 space-y-6">

            {/* Room type selector */}
            <div>
              <h3 className="font-bold text-stone-900 text-sm mb-3">Choose Room Type</h3>
              <div className="space-y-2">
                {roomTypes.map((r, i) => (
                  <button
                    key={r.name}
                    onClick={() => setRoomType(i)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
                      roomType === i
                        ? "border-indigo-500 bg-indigo-50 shadow-sm"
                        : "border-stone-200 hover:border-stone-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        roomType === i ? "border-indigo-500" : "border-stone-300"
                      }`}>
                        {roomType === i && <span className="w-2 h-2 rounded-full bg-indigo-500 block" />}
                      </span>
                      <div>
                        <div className="font-semibold text-stone-900 text-sm">{r.name}</div>
                        <div className="text-xs text-stone-400 mt-0.5">{r.size} · {r.beds} · {r.extra}</div>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-indigo-600 shrink-0 ml-2">
                      {fmt(Math.round(basePrice * ([1,1.4,1.9][i] ?? 1)))}<span className="text-xs font-normal text-stone-400">/night</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Booking form */}
            <div>
              <h3 className="font-bold text-stone-900 text-sm mb-3">Your Stay</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide block mb-1.5">Check-in</label>
                  <input
                    type="date"
                    value={checkIn}
                    min={dateOffset(0)}
                    onChange={e => handleHotelCheckIn(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide block mb-1.5">Check-out</label>
                  <input
                    type="date"
                    value={checkOut}
                    min={nextDate(checkIn)}
                    onChange={e => handleHotelCheckOut(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                  />
                </div>
              </div>
              {dateError && (
                <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                  {dateError}
                </p>
              )}
              <div>
                <label className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide block mb-1.5">Guests</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setGuests(g => Math.max(1, g - 1))} className="w-9 h-9 rounded-full border border-stone-200 text-stone-600 flex items-center justify-center hover:bg-stone-50 text-lg font-bold transition-colors">−</button>
                  <span className="text-sm font-semibold text-stone-900 w-6 text-center">{guests}</span>
                  <button onClick={() => setGuests(g => Math.min(10, g + 1))} className="w-9 h-9 rounded-full border border-stone-200 text-stone-600 flex items-center justify-center hover:bg-stone-50 text-lg font-bold transition-colors">+</button>
                  <span className="text-xs text-stone-400 ml-1">{guests === 1 ? "1 guest" : `${guests} guests`}</span>
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div>
              <h3 className="font-bold text-stone-900 text-sm mb-3">Amenities</h3>
              <div className="grid grid-cols-3 gap-3">
                {amenityGroups.map(g => (
                  <div key={g.label} className="bg-stone-50 rounded-2xl p-3">
                    <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-2">{g.label}</div>
                    <ul className="space-y-1.5">
                      {g.items.map(item => (
                        <li key={item} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 text-[10px] font-bold mt-0.5 shrink-0">✓</span>
                          <span className="text-[11px] text-stone-600 leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Price summary */}
            <div className="bg-indigo-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-stone-500">{roomTypes[roomType]?.name} · {nights} {nights === 1 ? "night" : "nights"}</span>
                <span className="text-sm font-semibold text-stone-900">{fmt(Math.round(basePrice * roomMultiplier))} × {nights}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-stone-500">Taxes & fees (18% GST)</span>
                <span className="text-sm font-semibold text-stone-900">{fmt(Math.round(total * 0.18))}</span>
              </div>
              <div className="border-t border-indigo-200 pt-2 mt-2 flex items-center justify-between">
                <span className="font-bold text-stone-900">Total</span>
                <span className="text-xl font-extrabold text-indigo-600">{fmt(Math.round(total * 1.18))}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Sticky footer CTA */}
        {booked ? (
          <div className="shrink-0 px-6 py-4 border-t border-stone-100 bg-emerald-50 flex items-center justify-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-sm flex items-center justify-center font-bold">✓</span>
            <span className="font-semibold text-emerald-700 text-sm">Continue with the full trip builder to confirm destination, hotel, transport, meals and payment.</span>
          </div>
        ) : (
          <div className="shrink-0 px-6 py-4 border-t border-stone-100 bg-white flex gap-3">
            <button onClick={onClose} className="flex-1 py-3.5 rounded-full border border-stone-200 text-stone-600 text-sm font-semibold hover:bg-stone-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => toggleHotel(dest.id, dest.name, hotel)}
              className={`w-12 rounded-full border text-sm font-semibold transition-all flex items-center justify-center shrink-0 ${
                isHotelSaved(dest.id, hotel.name)
                  ? "border-rose-300 bg-rose-50 text-rose-500"
                  : "border-stone-200 text-stone-400 hover:border-rose-300 hover:text-rose-400"
              }`}
            >
              <svg className={`w-4 h-4 ${isHotelSaved(dest.id, hotel.name) ? "fill-rose-500" : "fill-none"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
            </button>
            <button
              onClick={reserveHotel}
              className="flex-2 flex-grow-[2] py-3.5 rounded-full bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
            >
              Reserve · {fmt(Math.round(total * 1.18))}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DestinationPage({ destinationId }: { destinationId: string }) {
  const [destination, setDestination] = useState<DestinationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch("/destinations/" + destinationId)
      .then((res: any) => setDestination({ ...res.destination, nearbyDestinations: res.nearbyDestinations }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [destinationId]);

  if (loading) {
    return <LoadingState fullscreen message="Loading destination details..." />;
  }
  if (!destination) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-500 font-medium">Destination not found</div>;
  }

  return <DestinationPageInner destination={destination} />;
}

function DestinationBreadcrumb({ destination }: { destination: DestinationData }) {
  return (
    <div className="absolute left-10 top-24 z-20 hidden items-center gap-2 rounded-full border border-white/20 bg-black/20 px-4 py-2 text-xs font-semibold text-white/75 backdrop-blur-md md:flex">
      <span>Home</span>
      <span>/</span>
      <span>India</span>
      <span>/</span>
      <span className="text-white">{destination.name}</span>
    </div>
  );
}

function getLanguageForState(state: string) {
  const s = state.toLowerCase();
  if (s.includes("kerala")) return "Malayalam / English";
  if (s.includes("tamil nadu")) return "Tamil / English";
  if (s.includes("karnataka")) return "Kannada / English";
  if (s.includes("maharashtra")) return "Marathi / Hindi / English";
  if (s.includes("gujarat")) return "Gujarati / Hindi";
  if (s.includes("west bengal")) return "Bengali / English";
  if (s.includes("odisha")) return "Odia / English";
  if (s.includes("punjab")) return "Punjabi / Hindi";
  if (s.includes("assam")) return "Assamese / English";
  if (s.includes("andhra") || s.includes("telangana")) return "Telugu / English";
  if (s.includes("goa")) return "Konkani / English";
  return "Hindi / English";
}

function getBestTimeForClimate(climate: string) {
  const c = (climate || "").toLowerCase();
  if (c.includes("alpine") || c.includes("mountain") || c.includes("snow")) return "Mar - Jun & Sep - Nov";
  if (c.includes("arid") || c.includes("desert")) return "Nov - Feb";
  if (c.includes("tropical") || c.includes("humid")) return "Oct - Mar";
  if (c.includes("temperate")) return "Sep - May";
  return "Oct - Mar";
}

function getBudgetForCity(city: string) {
  const c = city.toLowerCase();
  if (c.includes("mumbai") || c.includes("delhi") || c.includes("bengaluru") || c.includes("goa")) return "INR 5,000 - 15,000/day";
  if (c.includes("ayodhya") || c.includes("varanasi") || c.includes("prayagraj") || c.includes("mathura")) return "INR 2,000 - 6,000/day";
  return "INR 3,000 - 8,500/day";
}

function QuickFactsSection({ destination }: { destination: DestinationData }) {
  const lang = destination.language || getLanguageForState(destination.state || "");
  const bestTime = destination.bestTime || destination.highlights?.find(item => /season/i.test(item.label))?.value || getBestTimeForClimate(destination.climateLabel || "");
  const budget = destination.budgetRange || getBudgetForCity(destination.city || destination.name || "");

  const facts = [
    ["Best Time To Visit", bestTime],
    ["Budget Range", budget],
    ["Temperature", destination.climateLabel || "Seasonal"],
    ["Language", lang],
    ["Nearest Airport", destination.airportName || `${destination.city || destination.name} Airport`],
    ["Nearest Railway Station", `${destination.city || destination.name} Railway Station`],
    ["Safety Rating", "4.6 / 5"],
    ["Internet Availability", "Good in city zones"],
    ["Currency", "Indian Rupee (INR)"],
    ["Travel Time", "2 - 5 days"],
  ];

  return (
    <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Quick Facts</div>
          <h2 className="mt-1 text-2xl font-extrabold text-stone-900">Before you go</h2>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Traveller ready</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {facts.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-stone-400">{label}</div>
            <div className="mt-1 text-sm font-bold text-stone-800">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayWiseItinerarySection({ destination, startDate, endDate }: { destination: DestinationData; startDate: string; endDate: string }) {
  const [openDay, setOpenDay] = useState(1);

  const start = new Date(startDate);
  const end = new Date(endDate);
  // User requested that 24 to 28 should equal 4 days (i.e. just checkout - checkin)
  let totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  if (isNaN(totalDays)) totalDays = 4;

  const activities = destination.activities || [];
  const fallbackMiddleActivities = ["Sightseeing", "Local exploration", "Adventure", "Leisure time", "Cultural experiences", "Shopping", "Food trail"];

  const days = Array.from({ length: totalDays }).map((_, index) => {
    const dayDate = new Date(start);
    dayDate.setDate(dayDate.getDate() + index);
    const dateStr = dayDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    if (index === 0) {
      return {
        title: "Arrival & Check-in",
        date: dateStr,
        items: ["Airport or station pickup", "Hotel check-in", "Relax & unpack", "Local market walk"]
      };
    }
    if (index === totalDays - 1 && totalDays > 1) {
      return {
        title: "Departure",
        date: dateStr,
        items: ["Slow breakfast", "Last-minute shopping", "Departure transfer"]
      };
    }

    const actIndex = (index - 1) % Math.max(1, activities.length);
    const act = activities[actIndex];
    if (act) {
      return {
        title: act.title,
        date: dateStr,
        items: [`${destination.name} exploration`, `${act.category} activity`, `Experience: ${act.title}`, "Evening leisure"]
      };
    } else {
      const fallbackAct = fallbackMiddleActivities[(index - 1) % fallbackMiddleActivities.length];
      return {
        title: fallbackAct,
        date: dateStr,
        items: [`${destination.name} guided tour`, "Landmark visits", "Local cuisine tasting", "Sunset viewpoint"]
      };
    }
  });

  return (
    <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-widest text-sky-600">Day Wise Itinerary</div>
        <h2 className="mt-1 text-2xl font-extrabold text-stone-900">{totalDays} Day Itinerary</h2>
      </div>
      <div className="space-y-3">
        {days.map((dayData, index) => {
          const day = index + 1;
          const open = openDay === day;
          return (
            <div key={day} className="overflow-hidden rounded-2xl border border-stone-100">
              <button onClick={() => setOpenDay(open ? 0 : day)} className="flex w-full items-center justify-between bg-stone-50 px-5 py-4 text-left">
                <div>
                  <div className="text-xs font-semibold text-stone-500 mb-1">{dayData.date}</div>
                  <span className="font-extrabold text-stone-900">Day {day}: {dayData.title}</span>
                </div>
                <span className="text-sm font-bold text-indigo-600">{open ? "Close" : "Open"}</span>
              </button>
              {open && (
                <div className="px-5 py-4">
                  {dayData.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="h-3 w-3 rounded-full bg-indigo-600 shrink-0" />
                        {itemIndex < dayData.items.length - 1 && <span className="flex-1 w-px bg-stone-200 my-1 min-h-[1.5rem]" />}
                      </div>
                      <div className="text-sm font-semibold text-stone-600 pb-5 leading-none mt-[-2px]">{item}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NearbyDestinationsSection({ destination }: { destination: any }) {
  const nearby = destination.nearbyDestinations || [];

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-rose-500">Nearby Destinations</div>
          <h2 className="mt-1 text-2xl font-extrabold text-stone-900">Add one more stop</h2>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {nearby.map((item: any) => (
          <a key={item.id} href={`/destination/${item.slug}`} className="group overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm block">
            <div className="relative h-44 overflow-hidden">
              <SafeImage src={item.heroImage || destination.heroImage} alt={item.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 text-lg font-extrabold text-white">{item.name}</div>
            </div>
          </a>
        ))}
        {nearby.length === 0 && <p className="text-stone-500 text-sm">No nearby destinations found.</p>}
      </div>
    </div>
  );
}

function ExpertInquiryModal({ onClose, destination }: { onClose: () => void, destination: any }) {
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", travelDates: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await apiFetch("/v1/inquiries", {
        method: "POST",
        body: JSON.stringify({ ...formData, destination: destination.name }),
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit inquiry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
            <h3 className="text-2xl font-bold text-stone-900 mb-2">Inquiry Sent!</h3>
            <p className="text-stone-500 text-sm mb-6">An expert will contact you shortly.</p>
            <button onClick={onClose} className="px-6 py-2.5 rounded-full bg-indigo-600 text-white font-semibold">Done</button>
          </div>
        ) : (
          <div className="p-6">
            <h3 className="text-xl font-bold text-stone-900 mb-1">Talk to an Expert</h3>
            <p className="text-stone-500 text-xs mb-5">Get customized plans for {destination.name}</p>
            {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Your Name" className="w-full px-4 py-2 rounded-xl border border-stone-200 text-sm" />
              <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="Your Email" className="w-full px-4 py-2 rounded-xl border border-stone-200 text-sm" />
              <input required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="Phone Number" className="w-full px-4 py-2 rounded-xl border border-stone-200 text-sm" />
              <input required value={formData.travelDates} onChange={e => setFormData({ ...formData, travelDates: e.target.value })} placeholder="Travel Dates (e.g. Mid Oct)" className="w-full px-4 py-2 rounded-xl border border-stone-200 text-sm" />
              <textarea required value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} placeholder="Tell us what you're looking for..." rows={3} className="w-full px-4 py-2 rounded-xl border border-stone-200 text-sm resize-none" />
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-stone-500 font-semibold text-sm">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2 rounded-full bg-indigo-600 text-white font-semibold text-sm disabled:opacity-50">
                  {submitting ? "Sending..." : "Submit Inquiry"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function dateOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function nextDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function validateBookingDates(start: string, end: string): string {
  if (!start || !end) return "Please select both check-in and check-out dates.";
  const s = new Date(start);
  const e = new Date(end);
  const today = new Date();
  today.setHours(0,0,0,0);
  if (s < today) return "Check-in date cannot be in the past.";
  if (e <= s) return "Check-out date must be after check-in date.";
  return "";
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function isVideoUrl(url?: string) {
  if (!url) return false;
  return url.match(/\.(mp4|webm|ogg)$/i) || url.includes("/video/upload/");
}

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

function DestinationHeroSlider({ destination }: { destination: DestinationData }) {
  const media = [destination.heroImage, ...(destination.gallery || [])].filter(Boolean);
  const uniqueMedia = Array.from(new Set(media));
  
  const [[page, direction], setPage] = useState([0, 0]);

  const imageIndex = Math.abs(page % uniqueMedia.length);

  const paginate = useCallback((newDirection: number) => {
    setPage(prev => [prev[0] + newDirection, newDirection]);
  }, []);

  useEffect(() => {
    if (uniqueMedia.length <= 1) return;
    
    // If the current media is a video, do not use the timer.
    if (isVideoUrl(uniqueMedia[imageIndex])) return;

    const timer = setInterval(() => {
      paginate(1);
    }, 3000);
    return () => clearInterval(timer);
  }, [paginate, uniqueMedia.length, imageIndex, uniqueMedia]);

  const variants = {
    enter: { opacity: 0, scale: 1.05 },
    center: { zIndex: 1, opacity: 1, scale: 1 },
    exit: { zIndex: 0, opacity: 0, scale: 1 },
  };

  let objPosition = "center";
  const name = destination.name.toLowerCase();
  if (name.includes("kerala")) objPosition = "center 70%";
  else if (name.includes("kashmir")) objPosition = "center 30%";
  else if (name.includes("goa")) objPosition = "center 60%";
  else if (name.includes("rajasthan")) objPosition = "center 40%";

  const currentMedia = uniqueMedia[imageIndex];

  return (
    <div className="absolute inset-0 overflow-hidden bg-stone-900 group">
      {uniqueMedia.length > 1 ? (
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={page}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);
              if (swipe < -swipeConfidenceThreshold) {
                paginate(1);
              } else if (swipe > swipeConfidenceThreshold) {
                paginate(-1);
              }
            }}
            transition={{ opacity: { duration: 0.8, ease: "easeInOut" }, scale: { duration: 1.2, ease: "easeOut" } }}
            className="absolute inset-0 w-full h-full touch-pan-y"
          >
            {isVideoUrl(currentMedia) ? (
              <video 
                src={currentMedia} 
                className="w-full h-full object-cover" 
                style={{ objectPosition: objPosition }}
                muted 
                loop={uniqueMedia.length === 1}
                autoPlay 
                playsInline 
                onEnded={() => {
                  if (uniqueMedia.length > 1) paginate(1);
                }}
              />
            ) : (
              <SafeImage
                src={currentMedia} 
                className="w-full h-full object-cover" 
                style={{ objectPosition: objPosition }}
                alt="" 
                loading="eager"
              />
            )}
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="absolute inset-0 w-full h-full">
            {isVideoUrl(uniqueMedia[0]) ? (
              <video src={uniqueMedia[0]} className="w-full h-full object-cover" style={{ objectPosition: objPosition }} muted loop autoPlay playsInline />
            ) : (
              <SafeImage src={uniqueMedia[0]} className="w-full h-full object-cover" style={{ objectPosition: objPosition }} alt="" loading="eager" />
            )}
        </div>
      )}

      {/* Navigation Arrows */}
      {uniqueMedia.length > 1 && (
        <>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/20 text-white flex items-center justify-center opacity-0 md:group-hover:opacity-100 transition-all duration-300 hover:bg-black/40 hover:scale-105 z-20 backdrop-blur-md border border-white/20"
            onClick={(e) => { e.stopPropagation(); paginate(-1); }}
          >
            <svg className="w-6 h-6 ml-[-2px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/20 text-white flex items-center justify-center opacity-0 md:group-hover:opacity-100 transition-all duration-300 hover:bg-black/40 hover:scale-105 z-20 backdrop-blur-md border border-white/20"
            onClick={(e) => { e.stopPropagation(); paginate(1); }}
          >
            <svg className="w-6 h-6 mr-[-2px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
          </button>

          {/* Counter */}
          <div className="absolute top-6 right-6 md:top-8 md:right-10 px-5 py-2 bg-black/40 backdrop-blur-md rounded-full text-white/90 text-sm font-bold tracking-widest z-20 border border-white/10">
            {imageIndex + 1} / {uniqueMedia.length}
          </div>

          {/* Dots */}
          <div className="absolute bottom-20 md:bottom-24 left-0 right-0 flex justify-center gap-2.5 z-20 pointer-events-none">
            {uniqueMedia.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setPage([i, i > imageIndex ? 1 : -1]);
                }}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 pointer-events-auto cursor-pointer ${
                  i === imageIndex ? "bg-white scale-110 shadow-[0_0_10px_rgba(255,255,255,1)]" : "bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* Gradients Removed */}
    </div>
  );
}

function DestinationPageInner({ destination }: { destination: DestinationData }) {
  const d = destination;
  const [, navigate] = useLocation();
  const { isDestSaved, toggleDestination, totalCount } = useWishlist();
  const [activeGallery, setActiveGallery] = useState<string | null>(null);
  const [adults, setAdults] = useState(2);
  const [startDate, setStartDate] = useState(() => dateOffset(14));
  const [endDate, setEndDate] = useState(() => dateOffset(20));
  const [saveAnim, setSaveAnim] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [itineraryOpen, setItineraryOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [tripBookingOpen, setTripBookingOpen] = useState(false);
  const [tripInitialHotel, setTripInitialHotel] = useState<HotelItem | null>(null);
  const [dateError, setDateError] = useState("");
  const [inquiryOpen, setInquiryOpen] = useState(false);

  const sectionIds = ["overview", "gallery", "activities", "hotels", "getting-there", "weather", "reviews"] as const;

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const sectionEls = sectionIds.map(id => document.getElementById(`section-${id}`));

    sectionEls.forEach((el) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(el.id.replace("section-", ""));
          }
        },
        { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(o => o.disconnect());
  }, []);

  function scrollToSection(id: string) {
    const el = document.getElementById(`section-${id}`);
    if (!el) return;
    const offset = 90;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  }

  const saved = isDestSaved(d.id);

  function handleSave() {
    toggleDestination({ id: d.id, name: d.name, state: d.state, heroImage: d.heroImage, rating: d.rating, region: d.region, tagline: d.tagline });
    setSaveAnim(true);
    setSaveToast(true);
    setTimeout(() => setSaveAnim(false), 600);
    setTimeout(() => setSaveToast(false), 2800);
  }

  function openTripBooking(hotel: HotelItem | null = null) {
    const error = validateBookingDates(startDate, endDate);
    if (error) {
      setDateError(error);
      return;
    }
    setDateError("");
    setTripInitialHotel(hotel);
    setTripBookingOpen(true);
  }

  function handleStartDate(value: string) {
    const today = dateOffset(0);
    if (value < today) {
      setDateError("Previous dates are not allowed.");
      setStartDate(today);
      if (endDate <= today) setEndDate(nextDate(today));
      return;
    }
    const safeStart = value;
    setStartDate(safeStart);
    if (endDate <= safeStart) {
      setDateError("Check-Out date must be after Check-In date.");
      setEndDate(nextDate(safeStart));
      return;
    }
    setDateError("");
  }

  function handleEndDate(value: string) {
    const error = validateBookingDates(startDate, value);
    if (error) {
      setDateError(error);
      setEndDate(nextDate(startDate));
      return;
    }
    setDateError("");
    setEndDate(value);
  }


  return (
    <DestCtx.Provider value={destination}>
    <div className="min-h-screen overflow-x-hidden bg-stone-50 font-sans text-stone-800 pt-[68px]">
      <Navbar />

      {/* Sub-nav for destination sections */}
      <div className="relative z-30 flex items-center gap-3 px-3 sm:px-4 md:px-10 py-3 bg-white border-b border-stone-100 shadow-sm">
        <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
          <div className="flex w-max items-center gap-1">
            {([
              { key: "explore", label: "Explore", onClick: () => scrollToSection("overview") },
              { key: "tours", label: "Tours", onClick: () => scrollToSection("activities") },
              { key: "hotels", label: "Hotels", onClick: () => scrollToSection("hotels") },
              { key: "share", label: "Share", onClick: () => setShareOpen(true) },
              { key: "save", label: "Save", onClick: handleSave },
            ] as { key: string; label: string; onClick: () => void }[]).map(({ key, label, onClick }) => (
              <button
                key={key}
                onClick={onClick}
                className="shrink-0 px-3 sm:px-4 py-2 text-sm font-medium text-stone-600 hover:text-indigo-600 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <button
            onClick={() => openTripBooking()}
            className="px-4 py-1.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Book Now
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="relative h-[52svh] min-h-[360px] max-h-[520px] overflow-hidden md:h-[calc(100vh-118px)] md:max-h-none md:min-h-[620px]">
        <DestinationHeroSlider destination={d} />
        {/* Breadcrumb */}
        <div className="absolute top-4 left-4 right-4 sm:right-auto md:top-8 md:left-10 flex max-w-[calc(100%-2rem)] items-center gap-2 overflow-x-auto whitespace-nowrap text-white/80 text-xs sm:text-sm font-medium bg-black/40 backdrop-blur-md px-4 sm:px-5 py-2 rounded-full border border-white/10 z-20">
          <span>Home</span>
          <span className="opacity-50">/</span>
          <span>India</span>
          <span className="opacity-50">/</span>
          <span className="text-white">{d.name}</span>
        </div>

        {/* Hero Content */}
        <div className="absolute bottom-10 left-0 right-0 px-4 sm:px-6 md:px-12 md:bottom-20 z-20 pointer-events-none">
          <div className="max-w-2xl text-left pointer-events-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-[10px] uppercase tracking-wider font-bold mb-4 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {d.country} — {d.region}
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-2 drop-shadow-lg">
              {d.name}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-white/90 font-medium mb-4 drop-shadow-md">
              {d.tagline || d.about.summary}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-white">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400 fill-amber-400 drop-shadow-sm" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="font-bold text-base drop-shadow-sm">{d.rating}</span>
                <span className="text-white/80 text-xs drop-shadow-sm">({d.reviews.toLocaleString()} reviews)</span>
              </div>
              <div className="w-px h-4 bg-white/40" />
              <span className="text-xs text-white/80 drop-shadow-sm">Loved by {Math.floor(d.reviews * 1.4).toLocaleString()}+ travellers</span>
            </div>
          </div>
        </div>

        {/* Hero save/share floating pill */}
        <div className="absolute top-6 right-10 hidden md:flex items-center gap-2">
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white text-sm font-medium hover:bg-white/25 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
            </svg>
            Share
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full backdrop-blur-md border text-sm font-medium transition-all duration-200 ${
              saved
                ? "bg-red-500/90 border-red-400 text-white"
                : "bg-white/15 border-white/25 text-white hover:bg-white/25"
            }`}
          >
            <svg
              className={`w-4 h-4 transition-all duration-300 ${saveAnim ? "scale-150" : "scale-100"} ${saved ? "fill-white" : "fill-none"}`}
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
            {saved ? "Saved!" : "Wishlist"}
          </button>
        </div>

        {/* Floating scroll hint */}
        <div className="absolute bottom-10 right-10 hidden md:flex flex-col items-center gap-2 text-white/50 text-xs">
          <div className="w-6 h-9 rounded-full border border-white/30 flex items-start justify-center p-1">
            <div className="w-1 h-2 rounded-full bg-white/60 animate-bounce" />
          </div>
          <span>Scroll</span>
        </div>
      </div>

      {/* Booking Bar */}
      <div className="relative z-10 mx-auto -mt-6 mb-8 w-full max-w-6xl px-4 sm:px-6 md:-mt-10 md:mb-10">
        <div className="grid w-full grid-cols-1 gap-3 rounded-3xl bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-4 lg:rounded-[2rem] lg:py-3 lg:pl-8 lg:pr-4">
          <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-stone-100 bg-stone-50 px-3 py-3 lg:flex-1 lg:min-w-[180px] lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
            <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Check In</div>
              <input
                type="date"
                value={startDate}
                min={dateOffset(0)}
                onChange={e => handleStartDate(e.target.value)}
                className="w-full min-w-0 text-sm font-medium text-stone-800 bg-transparent border-none outline-none cursor-pointer"
              />
            </div>
          </div>
          <div className="hidden h-8 w-px bg-stone-100 lg:block" />
          <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-stone-100 bg-stone-50 px-3 py-3 lg:flex-1 lg:min-w-[180px] lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
            <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Check Out</div>
              <input
                type="date"
                value={endDate}
                min={nextDate(startDate)}
                onChange={e => handleEndDate(e.target.value)}
                className="w-full min-w-0 text-sm font-medium text-stone-800 bg-transparent border-none outline-none cursor-pointer"
              />
            </div>
          </div>
          <div className="hidden h-8 w-px bg-stone-100 lg:block" />
          <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-stone-100 bg-stone-50 px-3 py-3 sm:col-span-2 lg:col-span-1 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
            <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div>
              <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Adults</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setAdults(Math.max(1, adults - 1))} className="w-5 h-5 rounded-full bg-stone-100 text-stone-500 text-xs flex items-center justify-center hover:bg-stone-200">−</button>
                <span className="text-sm font-medium w-4 text-center">{adults}</span>
                <button onClick={() => setAdults(adults + 1)} className="w-5 h-5 rounded-full bg-stone-100 text-stone-500 text-xs flex items-center justify-center hover:bg-stone-200">+</button>
              </div>
            </div>
          </div>
          <button
            onClick={() => openTripBooking()}
            className="w-full rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 sm:col-span-2 lg:col-span-1 lg:ml-auto lg:w-auto lg:rounded-full lg:py-2.5"
          >
            Search Packages
          </button>
          {dateError && (
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 sm:col-span-2 lg:basis-full">
              {dateError}
            </div>
          )}
        </div>
      </div>

      {/* Section Nav */}
      <div className="relative z-10 bg-white/95 backdrop-blur-sm border-b border-stone-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {([
              { id: "overview", label: "Overview" },
              { id: "gallery", label: "Gallery" },
              { id: "activities", label: "Activities" },
              { id: "hotels", label: "Hotels" },
              { id: "getting-there", label: "Getting There" },
              ...(d.weatherData?.length ? [{ id: "weather", label: "Weather" }] : []),
              { id: "reviews", label: "Reviews" },
            ] as { id: string; label: string }[]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className={`shrink-0 px-4 py-3.5 text-sm font-medium transition-all border-b-2 ${
                  activeSection === id
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-10 md:py-14 space-y-14 md:space-y-20">

        <div id="section-overview">
        {/* Highlights strip */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {d.highlights.map((h) => (
            <div key={h.label} className="flex flex-col items-center text-center p-4 rounded-2xl bg-white border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
              <span className="text-2xl mb-2">{h.icon}</span>
              <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">{h.label}</div>
              <div className="text-sm font-semibold text-stone-800">{h.value}</div>
            </div>
          ))}
        </div>

        <QuickFactsSection destination={d} />

        {/* About Section */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-3">{d.about.label}</div>
            <h2 className="text-2xl font-bold text-stone-900 leading-tight mb-5 sm:text-3xl md:text-4xl">
              {d.about.heading}
            </h2>
            <p className="text-stone-500 leading-relaxed mb-5">
              {d.about.para1}
            </p>
            <p className="text-stone-500 leading-relaxed mb-8">
              {d.about.para2}
            </p>
            <div className="flex flex-wrap gap-2">
              {d.about.tags.map(tag => (
                <span key={tag} className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {d.gallery.slice(0, 4).map((img, i) => (
              <div
                key={i}
                className={`overflow-hidden rounded-2xl cursor-pointer group ${i === 0 ? "row-span-2" : ""}`}
                onClick={() => setActiveGallery(img)}
              >
                <SafeImage
                  src={img}
                  alt=""
                  className={`w-full object-cover group-hover:scale-105 transition-transform duration-500 ${i === 0 ? "h-full min-h-[280px]" : "h-36"}`}
                />
              </div>
            ))}
          </div>
        </div>
        <DayWiseItinerarySection destination={d} startDate={startDate} endDate={endDate} />
        </div>

        <div id="section-gallery">
        {/* Photo Gallery */}
        <div>
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <div className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">Gallery</div>
              <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">Captured Moments</h2>
            </div>
            <button className="hidden text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors sm:flex items-center gap-1">
              View all photos
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {d.gallery.map((img, i) => (
              <div
                key={i}
                className="aspect-video overflow-hidden rounded-2xl cursor-pointer group relative"
                onClick={() => setActiveGallery(img)}
              >
                {isVideoUrl(img) ? (
                  <video src={img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" muted loop autoPlay playsInline />
                ) : (
                  <SafeImage src={img} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        </div>

        <div id="section-activities">
        {/* Activities */}
        <div>
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <div className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">Experiences</div>
              <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">Things to Do</h2>
            </div>
            <button className="hidden text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors sm:flex items-center gap-1">
              All activities
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:px-0 md:pb-0">
            {d.activities.map((act) => (
              <div key={act.title} onClick={() => setSelectedActivity(act)} className="w-[240px] shrink-0 snap-start rounded-2xl overflow-hidden bg-white border border-stone-100 shadow-sm hover:shadow-lg transition-shadow group cursor-pointer md:w-auto">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <SafeImage src={act.image} alt={act.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {act.badge && (
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-bold text-stone-700 shadow-sm">
                      {act.badge}
                    </div>
                  )}
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-indigo-600/90 text-white text-[10px] font-semibold">
                    {act.category}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 min-h-[2.5rem] font-bold text-stone-900 text-sm mb-2 leading-snug">{act.title}</h3>
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-xs text-stone-400 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {act.duration}
                    </span>
                    <span className="shrink-0 font-bold text-indigo-600 text-sm">From {act.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        </div>

        <div id="section-hotels">
        {/* Hotels */}
        <div>
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <div className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">Accommodation</div>
              <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">Where to Stay</h2>
            </div>
            <button className="hidden text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors sm:flex items-center gap-1">
              See all hotels
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-0">
            {d.hotels.map((h) => (
              <div key={h.name} onClick={() => openTripBooking(h)} className="w-[250px] shrink-0 snap-start rounded-2xl overflow-hidden bg-white border border-stone-100 shadow-sm hover:shadow-lg transition-shadow group cursor-pointer md:w-auto">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <SafeImage src={h.image} alt={h.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-semibold text-stone-700 shadow-sm">
                    {h.tag}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="line-clamp-2 min-h-[2.5rem] font-bold text-stone-900 text-sm leading-snug">{h.name}</h3>
                  </div>
                  <StarRating stars={h.stars} />
                  <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-stone-100">
                    <div className="min-w-0">
                      <span className="text-xl font-extrabold text-stone-900">{h.price}</span>
                      <span className="text-xs text-stone-400">{h.perNight}</span>
                    </div>
                    <button onClick={e => { e.stopPropagation(); openTripBooking(h); }} className="shrink-0 px-3 py-1.5 rounded-full border border-indigo-200 text-indigo-600 text-xs font-semibold hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors">
                      Book
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        </div>

        <div id="section-getting-there">
        {/* Getting There */}
        <GettingThereSection />
        </div>

        {d.weatherData?.length > 0 && (
          <div id="section-weather">
          {/* Weather & Best Time */}
          <WeatherSection />
          </div>
        )}

        <div id="section-reviews">
        {/* Reviews & Testimonials */}
        <ReviewsSection onSignInRequired={() => setSignInOpen(true)} setActiveGallery={setActiveGallery} />
        </div>

        <NearbyDestinationsSection destination={d} />

        {/* CTA Banner */}
        <div className="relative rounded-3xl overflow-hidden">
            <SafeImage
              src={d.heroImage}
              alt={d.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 via-indigo-800/80 to-transparent" />
          <div className="relative max-w-lg px-5 py-10 sm:px-8 md:px-14 md:py-16">
            <div className="text-xs font-semibold text-indigo-300 uppercase tracking-widest mb-3">Limited Offer</div>
            <h2 className="text-2xl font-extrabold text-white leading-tight mb-4 sm:text-3xl md:text-4xl">
              {d.about.ctaHeading}
            </h2>
            <p className="text-indigo-200 mb-8 leading-relaxed">
              {d.about.ctaDesc}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={() => openTripBooking()} className="px-7 py-3.5 rounded-full bg-white text-indigo-700 font-bold text-sm hover:bg-indigo-50 transition-colors shadow-lg">
                Build My Trip
              </button>
              <button onClick={() => setInquiryOpen(true)} className="px-7 py-3.5 rounded-full border border-white/30 text-white font-semibold text-sm hover:bg-white/10 transition-colors">
                Talk to Expert
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 mt-8">
        <div className="max-w-7xl mx-auto px-10 pt-14 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">

            {/* Brand column */}
            <div className="lg:col-span-2">
              <WandrLogo className="h-[32px] md:h-[36px] w-auto object-contain flex-shrink-0 scale-[1.5] md:scale-[1.8] origin-left mb-4" />
              <p className="text-sm leading-relaxed text-stone-400 max-w-xs mb-5">
                India's most trusted travel platform — curating unforgettable journeys across 7 iconic destinations with expert itineraries, verified reviews, and local expertise.
              </p>
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
                  <li key={d}><a href="#" className="text-sm hover:text-white transition-colors">{d}</a></li>
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


      {/* Save toast */}
      <div
        className={`fixed top-24 left-1/2 -translate-x-1/2 z-[120] transition-all duration-300 ${
          saveToast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"
        }`}
      >
        <div className={`flex items-center gap-3 px-5 py-3 rounded-full shadow-xl text-white text-sm font-semibold ${saved ? "bg-red-500" : "bg-stone-700"}`}>
          <svg className={`w-4 h-4 transition-all ${saveAnim ? "scale-125" : "scale-100"} ${saved ? "fill-white" : "fill-none"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
          </svg>
          {saved ? "Added to your Wishlist ✨" : "Removed from Wishlist"}
        </div>
      </div>

      {/* Itinerary panel */}
      {itineraryOpen && <ItineraryPanel onClose={() => setItineraryOpen(false)} />}

      {/* Activity modal */}
      {selectedActivity && (
        <ActivityModal act={selectedActivity} onClose={() => setSelectedActivity(null)} onBook={() => { setSelectedActivity(null); openTripBooking(); }} />
      )}

      {/* Guided trip booking */}
      {tripBookingOpen && (
        <DynamicBookingModal
          destination={destination}
          initialHotel={tripInitialHotel}
          onClose={() => setTripBookingOpen(false)}
          startDate={startDate}
          endDate={endDate}
          adults={adults}
          budget="Mid-range" // Defaulting to mid-range for direct destination booking
        />
      )}

      {/* Sign in modal */}
      {signInOpen && <SignInModal onClose={() => setSignInOpen(false)} />}

      {/* Share modal */}
      {shareOpen && <ShareModal onClose={() => setShareOpen(false)} />}

      {/* Inquiry modal */}
      {inquiryOpen && <ExpertInquiryModal onClose={() => setInquiryOpen(false)} destination={d} />}

      {/* Lightbox */}
      {activeGallery && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6"
          onClick={() => setActiveGallery(null)}
        >
          <button
            onClick={() => setActiveGallery(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors text-xl"
          >
            ×
          </button>
          {isVideoUrl(activeGallery) ? (
            <video
              src={activeGallery}
              className="w-full h-full max-w-5xl max-h-[85vh] object-contain rounded-xl shadow-2xl"
              onClick={e => e.stopPropagation()}
              autoPlay
              controls
              playsInline
            />
          ) : (
            <SafeImage
              src={activeGallery}
              alt=""
              className="max-w-5xl max-h-[85vh] object-contain rounded-xl shadow-2xl"
              onClick={e => e.stopPropagation()}
              loading="eager"
            />
          )}
        </div>
      )}
      {/* Chatbot removed, global SupportWidget used instead */}
    </div>
    </DestCtx.Provider>
  );
}
