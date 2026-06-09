import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { DESTINATIONS } from "@/data/destinations";
import type { DestinationData, ActivityItem, HotelItem } from "@/data/destinations";
import DynamicBookingModal from "@/components/booking/DynamicBookingModal";
import { apiFetch } from "@/lib/api";

// ─── Logo ──────────────────────────────────────────────────────────
function WandrLogo({ className = "" }: { className?: string }) {
  return (
    <img src="/logo.png" alt="Journey Junction" className={className} />
  );
}

// ─── Types ──────────────────────────────────────────────────────────
type TripType   = "Solo" | "Couple" | "Family" | "Group";
type BudgetTier = "Budget" | "Mid-range" | "Luxury";
type Step       = 1 | 2 | 3 | 4 | 5;
type Preference = "Adventure" | "Relaxation" | "Heritage" | "Spiritual";

interface FormState {
  destId:    string;
  checkIn:   string;
  checkOut:  string;
  adults:    number;
  children:  number;
  tripType:  TripType;
  budget:    BudgetTier;
  preferences: Preference[];
}

// ─── Itinerary Generator ────────────────────────────────────────────
function parseDays(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn), b = new Date(checkOut);
  const d = Math.round((b.getTime() - a.getTime()) / 86400000);
  return Math.max(1, Math.min(d, 14));
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateOffset(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return formatDateInput(date);
}

function nextDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return formatDateInput(date);
}

function validateTripDates(checkIn: string, checkOut: string) {
  const today = dateOffset(0);
  if (checkIn < today || checkOut < today) return "Previous dates are not allowed.";
  if (checkOut <= checkIn) return "Check-Out date must be after Check-In date.";
  return "";
}

const SLOT_EMOJIS = ["🌅","☀️","🌆","🌙"];
const SLOT_LABELS = ["Morning","Late Morning","Afternoon","Evening"];

interface DayPlan {
  day:   number;
  date:  string;
  slots: { label: string; emoji: string; activity: string; type: string; note: string; cost: string; }[];
  hotel: string; hotelTag: string; hotelPrice: string;
}

const GENERIC_ACTIVITIES: Record<string, {a:string; t:string; n:string; c:Record<BudgetTier,string>}[]> = {
  default: [
    { a:"Arrive & Hotel Check-in",          t:"Logistics",    n:"Settle in, freshen up",                    c:{ Budget:"Incl.", "Mid-range":"Incl.", Luxury:"Incl." } },
    { a:"Local Market Walk",                 t:"Culture",      n:"Explore local flavours & handicrafts",     c:{ Budget:"Free",  "Mid-range":"Free",  Luxury:"Free" } },
    { a:"Sunrise Viewpoint Visit",           t:"Nature",       n:"Best light for photographs",               c:{ Budget:"Free",  "Mid-range":"Free",  Luxury:"Free" } },
    { a:"Traditional Cuisine Lunch",         t:"Food",         n:"Must-try local specialties",               c:{ Budget:"₹300",  "Mid-range":"₹700",  Luxury:"₹1,500" } },
    { a:"Guided Heritage Walk",              t:"History",      n:"With a certified local guide",             c:{ Budget:"₹399",  "Mid-range":"₹799",  Luxury:"₹1,499" } },
    { a:"Sunset Photography Spot",           t:"Leisure",      n:"Golden hour — most iconic view",           c:{ Budget:"Free",  "Mid-range":"Free",  Luxury:"Free" } },
    { a:"Local Village Experience",          t:"Culture",      n:"Meet artisans, see traditions",            c:{ Budget:"₹499",  "Mid-range":"₹999",  Luxury:"₹1,999" } },
    { a:"Day Excursion to Nearby Landmark",  t:"Adventure",    n:"Full-day outing with transport",           c:{ Budget:"₹799",  "Mid-range":"₹1,499",Luxury:"₹3,499" } },
    { a:"Spa & Wellness Session",            t:"Wellness",     n:"Relax & rejuvenate",                       c:{ Budget:"₹799",  "Mid-range":"₹1,999",Luxury:"₹4,999" } },
    { a:"Farewell Dinner & Packing",         t:"Food",         n:"Last meal — savour local flavours",        c:{ Budget:"₹400",  "Mid-range":"₹1,000",Luxury:"₹2,500" } },
    { a:"Check-out & Departure Transfer",    t:"Logistics",    n:"Head to airport/station",                  c:{ Budget:"₹350",  "Mid-range":"₹600",  Luxury:"₹1,200" } },
  ],
};

function buildDayPlan(dest: DestinationData, form: FormState): DayPlan[] {
  const days    = parseDays(form.checkIn, form.checkOut);
  const budget  = form.budget;
  const actList = dest.activities;
  const hotelIdx= budget === "Luxury" ? 0 : budget === "Mid-range" ? Math.min(1, (dest.hotels?.length || 1) - 1) : (dest.hotels?.length || 1) - 1;
  const hotel   = dest.hotels?.[hotelIdx] ?? dest.hotels?.[0] ?? { name: "Local Hotel/Homestay", tag: "Comfortable stay", price: "Varies", perNight: "" };
  const generic = GENERIC_ACTIVITIES.default;
  const base    = new Date(form.checkIn);

  const actPool = [
    ...(dest.activities || []).map(a => ({ a: a.title, t: a.category, n: `${a.duration} · ${dest.name}`, c: { Budget: a.price, "Mid-range": a.price, Luxury: a.price } as Record<BudgetTier,string> })),
    ...generic,
  ];

  let poolIdx = 0;

  return Array.from({ length: days }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const dateStr = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

    const slotsCount = i === 0 ? 2 : i === days - 1 ? 3 : 4;
    const slots = Array.from({ length: slotsCount }, (__, s) => {
      const item = actPool[poolIdx % actPool.length];
      poolIdx++;
      return {
        label:    SLOT_LABELS[s],
        emoji:    SLOT_EMOJIS[s],
        activity: item.a,
        type:     item.t,
        note:     item.n,
        cost:     item.c[budget],
      };
    });

    return {
      day:       i + 1,
      date:      dateStr,
      slots,
      hotel:     hotel.name,
      hotelTag:  hotel.tag,
      hotelPrice: hotel.price + (hotel.perNight ? ` ${hotel.perNight}` : ""),
    };
  });
}

// ─── Step indicator ─────────────────────────────────────────────────
function StepDot({ step, current, label }: { step: Step; current: Step; label: string }) {
  const done    = current > step;
  const active  = current === step;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all
        ${done   ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200"   : ""}
        ${active ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200 ring-4 ring-indigo-100" : ""}
        ${!done && !active ? "bg-stone-100 text-stone-400" : ""}
      `}>
        {done ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : step}
      </div>
      <span className={`text-[10px] font-semibold uppercase tracking-widest ${active ? "text-indigo-600" : done ? "text-emerald-600" : "text-stone-400"}`}>
        {label}
      </span>
    </div>
  );
}

// ─── Budget cards ───────────────────────────────────────────────────
const BUDGET_OPTIONS: { tier: BudgetTier; emoji: string; tagline: string; range: string; color: string; bg: string; border: string; ring: string; }[] = [
  { tier: "Budget",    emoji: "🎒", tagline: "Smart travel, big experiences", range: "₹2,000 – ₹5,000 / day",  color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-100", ring: "ring-emerald-400" },
  { tier: "Mid-range", emoji: "✈️", tagline: "Comfort meets great value",     range: "₹5,000 – ₹15,000 / day", color: "text-indigo-700",  bg: "bg-indigo-50",   border: "border-indigo-100",  ring: "ring-indigo-400" },
  { tier: "Luxury",    emoji: "💎", tagline: "Only the finest experiences",   range: "₹15,000+ / day",          color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-100",   ring: "ring-amber-400" },
];

// ─── Trip type chips ────────────────────────────────────────────────
const TRIP_TYPES: { type: TripType; emoji: string }[] = [
  { type: "Solo",   emoji: "🧍" },
  { type: "Couple", emoji: "💑" },
  { type: "Family", emoji: "👨‍👩‍👧" },
  { type: "Group",  emoji: "👥" },
];

// ─── Region colour map ──────────────────────────────────────────────
const REGION_CHIP: Record<string, string> = {
  "West Coast":  "bg-sky-100 text-sky-700",
  "South India": "bg-emerald-100 text-emerald-700",
  "North India": "bg-amber-100 text-amber-700",
};

// ───────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ───────────────────────────────────────────────────────────────────
export default function PlanMyTripPage() {
  const [, navigate]  = useLocation();
  const [step, setStep] = useState<Step>(1);
  const [bookingOpen, setBookingOpen] = useState(false);

  const today      = dateOffset(0);
  const weekLater  = dateOffset(7);

  const [form, setForm] = useState<FormState>({
    destId:   "",
    checkIn:  today,
    checkOut: weekLater,
    adults:   2,
    children: 0,
    tripType: "Couple",
    budget:   "Mid-range",
    preferences: ["Heritage", "Relaxation"],
  });

  const [dests, setDests] = useState<any[]>([]);
  const [fullDest, setFullDest] = useState<DestinationData | null>(null);
  const [dateError, setDateError] = useState("");
  
  useEffect(() => {
    apiFetch("/destinations?limit=120").then((d: any) => setDests(d.destinations || []));
  }, []);

  useEffect(() => {
    if (!form.destId) return;
    apiFetch("/destinations/" + form.destId).then((d: any) => setFullDest(d.destination)).catch(console.error);
  }, [form.destId]);

  const dest        = fullDest;
  const nights      = form.checkIn && form.checkOut ? parseDays(form.checkIn, form.checkOut) : 0;
  const itinerary   = useMemo<DayPlan[]>(() => {
    if (!dest || !form.checkIn || !form.checkOut) return [];
    return buildDayPlan(dest, form);
  }, [dest, form]);

  // Estimate cost
  const totalCost = useMemo(() => {
    if (!itinerary.length || !dest) return null;
    const hotelIdx    = form.budget === "Luxury" ? 0 : form.budget === "Mid-range" ? Math.min(1, (dest.hotels?.length || 1) - 1) : (dest.hotels?.length || 1) - 1;
    const hotel       = dest.hotels?.[hotelIdx] ?? dest.hotels?.[0];
    const priceStr    = hotel ? hotel.price.replace(/[^0-9]/g, "") : "5000";
    const hotelTotal  = parseInt(priceStr || "5000", 10) * nights;
    const actTotal    = form.budget === "Budget" ? 3000 * nights : form.budget === "Mid-range" ? 7000 * nights : 18000 * nights;
    return hotelTotal + actTotal;
  }, [itinerary, dest, form.budget, nights]);

  // ── Handlers ──────────────────────────────────────────────────────
  function handleCheckIn(value: string) {
    if (value < today) {
      setDateError("Previous dates are not allowed.");
      setForm(f => ({ ...f, checkIn: today, checkOut: f.checkOut <= today ? nextDate(today) : f.checkOut }));
      return;
    }
    setForm(f => ({
      ...f,
      checkIn: value,
      checkOut: f.checkOut <= value ? nextDate(value) : f.checkOut,
    }));
    if (form.checkOut <= value) {
      setDateError("Check-Out date must be after Check-In date.");
      return;
    }
    setDateError("");
  }

  function handleCheckOut(value: string) {
    const error = validateTripDates(form.checkIn, value);
    if (error) {
      setDateError(error);
      setForm(f => ({ ...f, checkOut: nextDate(f.checkIn) }));
      return;
    }
    setDateError("");
    setForm(f => ({ ...f, checkOut: value }));
  }

  function next() {
    if (step === 2) {
      const error = validateTripDates(form.checkIn, form.checkOut);
      if (error) {
        setDateError(error);
        return;
      }
      setDateError("");
    }
    setStep(s => Math.min(5, s + 1) as Step);
  }
  function prev() { setStep(s => Math.max(1, s - 1) as Step); }

  // ── Progress bar width ────────────────────────────────────────────
  const progress = ((step - 1) / 4) * 100;

  return (
    <div className="min-h-screen bg-[#f8f5f0] font-sans text-stone-800">

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-100 flex items-center justify-between px-6 md:px-10 py-4">
        <button onClick={() => navigate("/")} className="flex items-center">
          <WandrLogo className="h-[32px] md:h-[36px] w-auto object-contain flex-shrink-0 scale-[1.5] md:scale-[1.8] origin-left" />
        </button>
        <div className="flex items-center gap-3 text-sm text-stone-500 font-medium">
          <span>Plan My Trip</span>
          <button onClick={() => navigate("/")} className="text-stone-400 hover:text-stone-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </nav>

      <div className="pt-16 max-w-4xl mx-auto px-4 md:px-6 pb-24">

        {/* Header */}
        <div className="text-center pt-10 pb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight mb-2">
            {step < 5 ? "AI Trip Planner" : "Your Personalised Itinerary"}
          </h1>
          <p className="text-stone-400 text-sm">
            {step === 1 && "Step 1 of 5 - Choose your destination"}
            {step === 2 && "Step 2 of 5 - Select travel dates and travellers"}
            {step === 3 && "Step 3 of 5 - Set your budget"}
            {step === 4 && "Step 4 of 5 - Pick travel preferences"}
            {step === 5 && `${nights} nights in ${dest?.name} - ${form.tripType} trip - ${form.budget}`}
          </p>
        </div>

        {/* Step indicator */}
        {step < 5 && (
          <div className="mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <StepDot step={1} current={step} label="Destination" />
              <div className={`flex-1 max-w-[80px] h-1 rounded-full transition-all duration-500 ${step > 1 ? "bg-emerald-400" : "bg-stone-200"}`} />
              <StepDot step={2} current={step} label="Dates" />
              <div className={`flex-1 max-w-[80px] h-1 rounded-full transition-all duration-500 ${step > 2 ? "bg-emerald-400" : "bg-stone-200"}`} />
              <StepDot step={3} current={step} label="Budget" />
              <div className={`flex-1 max-w-[80px] h-1 rounded-full transition-all duration-500 ${step > 3 ? "bg-emerald-400" : "bg-stone-200"}`} />
              <StepDot step={4} current={step} label="Prefs" />
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* ── STEP 1: Destination ───────────────────────────────── */}
        {step === 1 && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dests.map((d, i) => (
                <button
                  key={`${d.slug || d.id}-${i}`}
                  onClick={() => setForm(f => ({ ...f, destId: d.slug || d.id }))}
                  className={`relative rounded-2xl overflow-hidden aspect-[4/3] text-left shadow-sm transition-all duration-200 focus:outline-none
                    ${form.destId === (d.slug || d.id) ? "ring-4 ring-indigo-500 shadow-xl scale-[1.02]" : "hover:shadow-md hover:scale-[1.01]"}
                  `}
                >
                  <img
                    src={`${(d.heroImage || "").split("?")[0]}?w=600&q=75&fit=crop`}
                    alt={d.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  {/* Selected check */}
                  {form.destId === (d.slug || d.id) && (
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center shadow-md">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${REGION_CHIP[d.region] ?? "bg-white/20 text-white"}`}>
                      {d.region}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-amber-400 text-xs">★</span>
                      <span className="text-white text-xs font-semibold">{d.rating}</span>
                    </div>
                    <h3 className="text-white font-bold text-lg leading-tight">{d.name}</h3>
                    <p className="text-white/70 text-xs mt-0.5 line-clamp-1">{d.tagline}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(d.tags || []).slice(0, 3).map((t: string) => (
                        <span key={t} className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-medium">{t}</span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={next}
                disabled={!form.destId}
                className="px-8 py-3 rounded-full bg-indigo-600 text-white text-sm font-semibold shadow hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Continue
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Dates & Group ─────────────────────────────── */}
        {step === 2 && dest && (
          <div className="space-y-6">

            {/* Selected destination chip */}
            <div className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
              <img src={`${dest.heroImage.split("?")[0]}?w=120&q=70&fit=crop`} className="w-14 h-14 rounded-xl object-cover" alt={dest.name} />
              <div>
                <div className="font-bold text-stone-900">{dest.name}</div>
                <div className="text-xs text-stone-400">{dest.tagline}</div>
                <div className="flex gap-1 mt-1">
                  <span className="text-amber-400 text-xs">★ {dest.rating}</span>
                  <span className="text-stone-300">·</span>
                  <span className="text-xs text-stone-400">{dest.highlights.find(h => h.label === "Best Season")?.value}</span>
                </div>
              </div>
              <button onClick={prev} className="ml-auto text-xs text-indigo-500 hover:text-indigo-700 font-medium">Change</button>
            </div>

            {/* Dates */}
            <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
              <h3 className="font-bold text-stone-900 mb-4">Travel Dates</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-widest block mb-2">Check-in</label>
                  <input
                    type="date"
                    min={today}
                    value={form.checkIn}
                    onChange={e => handleCheckIn(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-widest block mb-2">Check-out</label>
                  <input
                    type="date"
                    min={nextDate(form.checkIn)}
                    value={form.checkOut}
                    onChange={e => handleCheckOut(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>
              {dateError && (
                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                  {dateError}
                </p>
              )}
              {nights > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {nights} {nights === 1 ? "night" : "nights"} · {nights + 1} days
                </div>
              )}
            </div>

            {/* Group size */}
            <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
              <h3 className="font-bold text-stone-900 mb-4">Group Size</h3>
              <div className="grid grid-cols-2 gap-4 mb-5">
                {[
                  { label: "Adults", key: "adults" as const, min: 1, max: 20 },
                  { label: "Children", key: "children" as const, min: 0, max: 10 },
                ].map(({ label, key, min, max }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-stone-500 uppercase tracking-widest block mb-2">{label}</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setForm(f => ({ ...f, [key]: Math.max(min, f[key] - 1) }))}
                        className="w-9 h-9 rounded-full border border-stone-200 flex items-center justify-center text-lg text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-30"
                        disabled={form[key] <= min}
                      >−</button>
                      <span className="text-xl font-bold text-stone-900 w-6 text-center">{form[key]}</span>
                      <button
                        onClick={() => setForm(f => ({ ...f, [key]: Math.min(max, f[key] + 1) }))}
                        className="w-9 h-9 rounded-full border border-stone-200 flex items-center justify-center text-lg text-stone-600 hover:bg-stone-50 transition-colors"
                        disabled={form[key] >= max}
                      >+</button>
                    </div>
                  </div>
                ))}
              </div>

              <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-3">Trip Type</h4>
              <div className="flex flex-wrap gap-2">
                {TRIP_TYPES.map(({ type, emoji }) => (
                  <button
                    key={type}
                    onClick={() => setForm(f => ({ ...f, tripType: type }))}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all
                      ${form.tripType === type
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white text-stone-600 border-stone-200 hover:border-indigo-300 hover:text-indigo-600"}
                    `}
                  >
                    <span>{emoji}</span> {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={prev} className="px-6 py-3 rounded-full border border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                onClick={next}
                disabled={nights < 1}
                className="px-8 py-3 rounded-full bg-indigo-600 text-white text-sm font-semibold shadow hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Continue
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Budget ───────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {BUDGET_OPTIONS.map(b => (
                <button
                  key={b.tier}
                  onClick={() => setForm(f => ({ ...f, budget: b.tier }))}
                  className={`p-5 rounded-2xl border-2 text-left transition-all duration-200 focus:outline-none
                    ${form.budget === b.tier
                      ? `${b.bg} ${b.border} ring-2 ${b.ring} shadow-md`
                      : "bg-white border-stone-100 hover:border-stone-200 hover:shadow-sm"}
                  `}
                >
                  <div className="text-3xl mb-3">{b.emoji}</div>
                  <div className={`font-bold text-base mb-1 ${form.budget === b.tier ? b.color : "text-stone-800"}`}>{b.tier}</div>
                  <div className="text-xs text-stone-500 mb-3 leading-relaxed">{b.tagline}</div>
                  <div className={`text-xs font-bold ${form.budget === b.tier ? b.color : "text-stone-600"}`}>{b.range}</div>
                  {form.budget === b.tier && (
                    <div className={`mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${b.color}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Selected
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* What's included note */}
            <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
              <h4 className="font-bold text-stone-900 mb-3 text-sm">What's included in your plan</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  "Day-by-day activity schedule",
                  "Hotel recommendations for your budget",
                  "Morning, afternoon & evening slots",
                  "Local food & dining suggestions",
                  "Transport tips & estimated costs",
                  "Best local experiences per destination",
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm text-stone-600">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
              <h4 className="font-bold text-stone-900 mb-1 text-sm">Trip preferences</h4>
              <p className="text-xs text-stone-400 mb-4">Choose the mood for your itinerary preview.</p>
              <div className="flex flex-wrap gap-2">
                {(["Adventure", "Relaxation", "Heritage", "Spiritual"] as Preference[]).map(pref => {
                  const active = form.preferences.includes(pref);
                  return (
                    <button
                      key={pref}
                      onClick={() => setForm(f => ({
                        ...f,
                        preferences: active ? f.preferences.filter(item => item !== pref) : [...f.preferences, pref],
                      }))}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-stone-600 border-stone-200 hover:border-indigo-300 hover:text-indigo-600"}`}
                    >
                      {pref}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={prev} className="px-6 py-3 rounded-full border border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                onClick={next}
                className="px-8 py-3 rounded-full bg-indigo-600 text-white text-sm font-semibold shadow hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
              <div className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-2">Preferences</div>
              <h2 className="text-2xl font-extrabold text-stone-900 mb-2">What kind of trip should we build?</h2>
              <p className="text-sm text-stone-400 mb-5">Choose one or more preferences. The itinerary preview will use these as its planning mood.</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(["Adventure", "Relaxation", "Heritage", "Spiritual"] as Preference[]).map(pref => {
                  const active = form.preferences.includes(pref);
                  return (
                    <button
                      key={pref}
                      onClick={() => setForm(f => ({
                        ...f,
                        preferences: active ? f.preferences.filter(item => item !== pref) : [...f.preferences, pref],
                      }))}
                      className={`rounded-2xl border p-4 text-left transition-all ${active ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200" : "border-stone-100 bg-white hover:border-indigo-200"}`}
                    >
                      <div className="text-sm font-extrabold text-stone-900">{pref}</div>
                      <div className="mt-1 text-xs text-stone-400">
                        {pref === "Adventure" && "Treks, rafting, water sports"}
                        {pref === "Relaxation" && "Slow stays, wellness, sunsets"}
                        {pref === "Heritage" && "Forts, walks, museums"}
                        {pref === "Spiritual" && "Temples, ghats, rituals"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-between">
              <button onClick={prev} className="px-6 py-3 rounded-full border border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-all">Back</button>
              <button onClick={next} className="px-8 py-3 rounded-full bg-indigo-600 text-white text-sm font-semibold shadow hover:bg-indigo-700 transition-all">Generate Itinerary</button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Itinerary ────────────────────────────────── */}
        {step === 5 && dest && (
          <div className="space-y-6">

            {/* Summary banner */}
            <div className="relative rounded-2xl overflow-hidden">
              <img src={`${dest.heroImage.split("?")[0]}?w=1200&q=80&fit=crop`} alt={dest.name} className="w-full h-40 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
              <div className="absolute inset-0 flex items-center px-6 gap-6">
                <div className="flex-1">
                  <div className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-1">Your personalised itinerary</div>
                  <h2 className="text-white text-2xl font-extrabold">{dest.name}</h2>
                  <p className="text-white/70 text-sm mt-0.5">{dest.tagline}</p>
                </div>
                <div className="hidden sm:grid grid-cols-2 gap-3 text-center">
                  {[
                    { label: "Nights",  value: String(nights) },
                    { label: "Days",    value: String(nights + 1) },
                    { label: "People",  value: String(form.adults + form.children) },
                    { label: "Budget",  value: form.budget },
                    { label: "Focus",   value: form.preferences.slice(0, 2).join(", ") || "Balanced" },
                  ].map(s => (
                    <div key={s.label} className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2">
                      <div className="text-white font-bold text-sm">{s.value}</div>
                      <div className="text-white/60 text-[10px]">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cost estimate */}
            {totalCost && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-indigo-700 font-bold text-sm">Estimated Total</div>
                  <div className="text-indigo-500 text-xs mt-0.5">{nights} nights · {form.adults} adult{form.adults > 1 ? "s" : ""}{form.children > 0 ? ` · ${form.children} child${form.children > 1 ? "ren" : ""}` : ""} · {form.budget}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-indigo-700">₹{totalCost.toLocaleString("en-IN")}</div>
                  <div className="text-indigo-400 text-xs">hotel + activities</div>
                </div>
              </div>
            )}

            {/* Hotel recommendation */}
            {(() => {
              const hotelIdx = form.budget === "Luxury" ? 0 : form.budget === "Mid-range" ? Math.min(1, (dest.hotels?.length || 1) - 1) : (dest.hotels?.length || 1) - 1;
              const hotel    = dest.hotels?.[hotelIdx] ?? dest.hotels?.[0];
              if (!hotel) return null;
              return (
                <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                  <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-stone-50">
                    <h3 className="font-bold text-stone-900 text-sm">Recommended Stay</h3>
                    <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-1 rounded-full">{form.budget}</span>
                  </div>
                  <div className="flex items-center gap-4 p-4">
                    <img src={`${hotel.image.split("?")[0]}?w=200&q=70&fit=crop`} alt={hotel.name} className="w-20 h-16 rounded-xl object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-stone-900 text-sm truncate">{hotel.name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {Array.from({ length: hotel.stars }).map((_, i) => (
                          <span key={i} className="text-amber-400 text-xs">★</span>
                        ))}
                      </div>
                      <div className="text-xs text-stone-400 mt-0.5">{hotel.tag}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-stone-900 text-sm">{hotel.price}</div>
                      <div className="text-xs text-stone-400">{hotel.perNight}</div>
                      <div className="text-xs font-semibold text-indigo-600 mt-1">× {nights} nights</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Day-by-day */}
            <div className="space-y-4">
              {itinerary.map(day => (
                <div key={day.day} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                  {/* Day header */}
                  <div className="flex items-center justify-between px-5 py-3 bg-stone-50 border-b border-stone-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-extrabold flex items-center justify-center shadow-sm">
                        {day.day}
                      </div>
                      <div>
                        <div className="font-bold text-stone-900 text-sm">Day {day.day}</div>
                        <div className="text-[11px] text-stone-400">{day.date}</div>
                      </div>
                    </div>
                    <div className="text-xs text-stone-400 hidden sm:block">{dest.name}</div>
                  </div>

                  {/* Slots */}
                  <div className="divide-y divide-stone-50">
                    {day.slots.map((slot, si) => (
                      <div key={si} className="flex items-start gap-3 px-5 py-3.5 hover:bg-stone-50/50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-base shrink-0 mt-0.5">
                          {slot.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest w-20 shrink-0">{slot.label}</span>
                            <span className="font-semibold text-stone-900 text-sm">{slot.activity}</span>
                            <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-medium">{slot.type}</span>
                          </div>
                          <p className="text-xs text-stone-400 mt-0.5 ml-[calc(5rem)]">{slot.note}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-stone-700 bg-stone-50 px-2 py-1 rounded-lg border border-stone-100">{slot.cost}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Night stay note */}
                  {day.day < nights + 1 && (
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 border-t border-indigo-100">
                      <span className="text-sm">🌙</span>
                      <span className="text-xs text-indigo-700 font-medium">{day.hotel}</span>
                      <span className="text-xs text-indigo-400 ml-auto">{day.hotelPrice}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Tips from destination */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">💡</span>
                <h4 className="font-bold text-amber-900 text-sm">Local Tips for {dest.name}</h4>
              </div>
              <div className="space-y-2">
                {[dest.flightTip, dest.trainTip].filter(Boolean).slice(0, 2).map((tip, i) => (
                  <p key={i} className="text-xs text-amber-800 leading-relaxed">• {tip}</p>
                ))}
              </div>
            </div>

            {/* CTA buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <button
                onClick={() => setBookingOpen(true)}
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Book Now
              </button>
              <button
                onClick={() => navigate(`/destination/${dest.id}`)}
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                Explore {dest.name}
              </button>
              <button
                onClick={() => { setStep(1); setForm(f => ({ ...f, destId: "" })); }}
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-stone-200 text-stone-700 text-sm font-semibold hover:bg-stone-50 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Plan Another Trip
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-stone-200 text-stone-700 text-sm font-semibold hover:bg-stone-50 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print / Save PDF
              </button>
            </div>

            {/* Start over */}
            <div className="text-center pt-2">
              <button onClick={prev} className="text-xs text-stone-400 hover:text-stone-600 transition-colors underline underline-offset-2">
                ← Adjust budget
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Booking Modal */}
        {bookingOpen && dest && (
          <DynamicBookingModal
            destination={dest}
            initialHotel={
              dest.hotels[form.budget === "Luxury" ? 0 : form.budget === "Mid-range" ? Math.min(1, dest.hotels.length - 1) : dest.hotels.length - 1] ?? dest.hotels[0]
            }
            onClose={() => setBookingOpen(false)}
            startDate={form.checkIn}
            endDate={form.checkOut}
            adults={form.adults}
            budget={form.budget}
          />
        )}
      </div>
    </div>
  );
}

