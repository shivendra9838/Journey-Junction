import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { DestinationData, HotelItem, MealPlanItem } from "@/data/destinations";
import { useUser } from "@/context/UserContext";
import { apiFetch } from "@/lib/api";
import { coordinatesForDestination } from "@/lib/geo";
import type { Coordinates } from "@/lib/geo";
import { getBookingConfig } from "@/data/bookingConfig";
import { Button } from "@/components/ui/button";

const OpenStreetMap = lazy(() => import("@/components/maps/OpenStreetMap"));

export type TransportCategory = { id: string; name: string };
export type VehicleOption = { id: string; mode: string; type: string; name: string; capacity: number; price: number; description: string; image: string };
export type PickupOption = { id: string; label: string; address: string; latitude: number; longitude: number; type: string };
export type PickupSuggestion = { description: string; placeId: string; latitude: number; longitude: number };
export type TravellerForm = { name: string; age: string; phone: string; email: string; notes: string };
export type FlightOption = { id: string; airline: string; departureTime: string; arrivalTime: string; duration: string; price: number };

type FlowStep = "destination" | "dates" | "transport" | "stay" | "experiences" | "travellers" | "review";
type TransportType = "Flight" | "Train" | "Bus" | "Cab" | "Self Drive";
type BookingHotel = {
  id?: string;
  name: string;
  image?: string;
  images?: string[];
  price?: string;
  pricePerNight?: number;
  perNight?: string;
  rating?: number;
  stars?: number;
  location?: string;
  description?: string;
  amenities?: string[];
  tag?: string | null;
};
type BookingActivity = {
  id?: string;
  title: string;
  name?: string;
  category?: string;
  duration?: string;
  price?: string;
  amount?: number;
  image?: string;
  description?: string;
  badge?: string | null;
};

const FLOW_LABELS: Record<FlowStep, string> = {
  destination: "Destination",
  dates: "Dates",
  transport: "Transport",
  stay: "Stay",
  experiences: "Activities",
  travellers: "Details",
  review: "Review",
};

const TRANSPORT_TABS: Array<{ label: TransportType; price: number; note: string }> = [
  { label: "Flight", price: 0, note: "Fastest route" },
  { label: "Train", price: 2200, note: "Scenic and relaxed" },
  { label: "Bus", price: 1400, note: "Budget friendly" },
  { label: "Cab", price: 0, note: "Doorstep pickup" },
  { label: "Self Drive", price: 3800, note: "Flexible stops" },
];

const INDIAN_STATES_AND_UTS = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu & Kashmir",
  "Ladakh",
  "Chandigarh",
  "Puducherry",
  "Lakshadweep",
  "Andaman & Nicobar",
  "Dadra & Nagar Haveli and Daman & Diu",
];
const DATE_SUGGESTIONS = ["This weekend", "Next weekend", "5 days", "Flexible dates"];
const POPULAR_TAGS = ["Beach", "Mountains", "Heritage", "Backwaters", "Food", "Adventure"];

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

function tripNights(start: string, end: string) {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000));
}

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function parseCurrency(str?: string) {
  return parseInt((str || "").replace(/[^0-9]/g, ""), 10) || 0;
}

function nextDate(date: string, offset = 1) {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + offset);
  return value.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function defaultMealPlans(destination: DestinationData): MealPlanItem[] {
  return destination.meals || [];
}

function normalizeHotel(hotel: HotelItem | BookingHotel | null): BookingHotel | null {
  if (!hotel) return null;
  return {
    ...hotel,
    image: hotel.image,
    rating: "stars" in hotel ? hotel.stars : hotel.rating,
    location: "location" in hotel ? hotel.location : undefined,
    amenities: "amenities" in hotel ? hotel.amenities : [hotel.tag].filter(Boolean) as string[],
  };
}

function hotelPrice(hotel: BookingHotel | null) {
  if (!hotel) return 0;
  return hotel.pricePerNight || parseCurrency(hotel.price);
}

function activityPrice(activity: BookingActivity) {
  return activity.amount || parseCurrency(activity.price);
}

function Icon({ path, className = "h-5 w-5" }: { path: string; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    </svg>
  );
}

function SafeImage({ src, alt, className }: { src?: string; alt: string; className: string }) {
  const fallback = "/images/unsplash-be41aa2e4372.jpg";
  const [currentSrc, setCurrentSrc] = useState(src || fallback);

  useEffect(() => {
    setCurrentSrc(src || fallback);
  }, [src]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => {
        if (currentSrc !== fallback) setCurrentSrc(fallback);
      }}
    />
  );
}

export default function DynamicBookingModal({
  destination,
  initialHotel,
  startDate,
  endDate,
  adults,
  budget = "Mid-range",
  onClose,
}: {
  destination: DestinationData;
  initialHotel: HotelItem | null;
  startDate: string;
  endDate: string;
  adults: number;
  budget?: string;
  onClose: () => void;
}) {
  const { user } = useUser();
  const destinationSlug = (destination as any).slug || destination.id;
  const config = getBookingConfig(destinationSlug);
  const flowSteps: FlowStep[] = useMemo(
    () => ["destination", "dates", "transport", "stay", "experiences", "travellers", "review"],
    [],
  );
  const hasPrefilledDestinationAndDates = Boolean(destination?.id && startDate && endDate);
  const initialStepIndex = hasPrefilledDestinationAndDates ? 2 : 0;

  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  const [direction, setDirection] = useState(1);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const step = flowSteps[stepIndex];

  const [bookingStartDate, setBookingStartDate] = useState(startDate || todayISO());
  const [bookingEndDate, setBookingEndDate] = useState(endDate || nextDate(startDate || todayISO(), 2));
  const [selectedHotel, setSelectedHotel] = useState<BookingHotel | null>(normalizeHotel(initialHotel));
  const initialMode = budget === "Luxury" ? "VVIP" : budget === "Mid-range" ? "VIP" : "Normal";
  const [travelMode, setTravelMode] = useState<"Normal" | "VIP" | "VVIP">(initialMode);
  const [selectedTransportType, setSelectedTransportType] = useState<TransportType>("Flight");
  const [categories, setCategories] = useState<TransportCategory[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [pickupLocations, setPickupLocations] = useState<PickupOption[]>([]);
  const [selectedPickup, setSelectedPickup] = useState<PickupOption | null>(null);
  const [customPickup, setCustomPickup] = useState("");
  const [customPickupCoords, setCustomPickupCoords] = useState<Coordinates | null>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<PickupSuggestion[]>([]);
  const [selectedTransport, setSelectedTransport] = useState<VehicleOption | null>(null);
  const [transportLoading, setTransportLoading] = useState(false);
  const [hotelsLoading, setHotelsLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [bookingHotels, setBookingHotels] = useState<BookingHotel[]>([]);
  const [bookingActivities, setBookingActivities] = useState<BookingActivity[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<MealPlanItem | null>(null);
  const [traveller, setTraveller] = useState<TravellerForm>({ name: "", age: "", phone: "", email: "", notes: "" });
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [originCity, setOriginCity] = useState("Delhi");
  const [selectedFlight, setSelectedFlight] = useState<FlightOption | null>(null);
  const [flightsList, setFlightsList] = useState<FlightOption[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  const mealPlans = destination.meals?.length ? destination.meals : defaultMealPlans(destination);
  const nights = tripNights(bookingStartDate, bookingEndDate);
  const days = nights;
  const destinationBaseAmount = Math.max(3500, days * adults * 1200);
  const hotelAmount = hotelPrice(selectedHotel);
  const selectedTransportMeta = TRANSPORT_TABS.find(item => item.label === selectedTransportType);
  const cabAmount = selectedTransport ? selectedTransport.price : selectedTransportType === "Cab" ? 3200 : 0;
  const flightAmount = selectedTransportType === "Flight" && selectedFlight ? selectedFlight.price * adults : 0;
  const groundTransportAmount = selectedTransportType !== "Flight" ? (cabAmount || selectedTransportMeta?.price || 0) : 0;
  const selectedActivityItems = bookingActivities.filter(activity => selectedActivities.includes(activity.id || activity.title));
  const activitiesAmount = selectedActivityItems.reduce((sum, activity) => sum + activityPrice(activity) * adults, 0);
  const mealAmount = selectedMeal ? parseCurrency(selectedMeal.price) * days * adults : 0;
  const subtotal = destinationBaseAmount + hotelAmount + flightAmount + groundTransportAmount + activitiesAmount + mealAmount;
  const serviceAmount = 0;
  const total = subtotal + serviceAmount;
  const journeyDaysLeft = Math.max(0, daysUntil(bookingStartDate));
  const destinationCoordinates = coordinatesForDestination(destination);
  const selectedPickupCoordinates = selectedPickup
    ? { latitude: selectedPickup.latitude, longitude: selectedPickup.longitude }
    : customPickupCoords;

  const destinationCards = [
    { name: destination.name, state: destination.state, image: destination.heroImage, active: true },
    { name: "Kerala", state: "South India", image: "/images/unsplash-451710d2942a.jpg" },
    { name: "Kashmir", state: "North India", image: "/images/unsplash-1925bee154dc.jpg" },
  ];

  const summaryRows = [
    ["Destination", destination.name, destinationBaseAmount],
    ["Dates", `${bookingStartDate} to ${bookingEndDate}`, 0],
    ["Transport", selectedTransportType === "Flight" ? (selectedFlight ? `${selectedFlight.airline} from ${originCity}` : "Flight not selected") : selectedTransportType, flightAmount + groundTransportAmount],
    ["Stay", selectedHotel?.name || "Not selected", hotelAmount],
    ...(selectedActivities.length ? [["Experiences", `${selectedActivities.length} selected`, activitiesAmount] as [string, string, number]] : []),
    ...(mealAmount > 0 ? [["Meals", selectedMeal?.title || "Meal plan", mealAmount] as [string, string, number]] : []),
  ] as Array<[string, string, number]>;

  useEffect(() => {
    if (!user) return;
    setTraveller(current => ({
      ...current,
      name: current.name || user.name || "",
      email: current.email || user.email || "",
    }));
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    setTransportLoading(true);
    apiFetch<{ categories: TransportCategory[]; vehicles: VehicleOption[]; pickupLocations: PickupOption[] }>(`/transport/options?destinationSlug=${encodeURIComponent(destinationSlug)}&mode=${encodeURIComponent(travelMode)}`)
      .then(data => {
        if (cancelled) return;
        setCategories(data.categories);
        setVehicles(data.vehicles);
        setPickupLocations(data.pickupLocations);
        setSelectedTransport(current => current?.mode === travelMode ? current : null);
        setSelectedPickup(current => current && data.pickupLocations.some(item => item.id === current.id) ? current : null);
      })
      .catch(() => {
        if (!cancelled) {
          setCategories([]);
          setVehicles([]);
          setPickupLocations([]);
        }
      })
      .finally(() => !cancelled && setTransportLoading(false));
    return () => {
      cancelled = true;
    };
  }, [destinationSlug, travelMode]);

  useEffect(() => {
    let cancelled = false;
    setHotelsLoading(true);
    apiFetch<{ hotels: BookingHotel[] }>(`/hotels?destination=${encodeURIComponent(destinationSlug)}`)
      .then(data => {
        if (cancelled) return;
        const hotels = data.hotels ?? [];
        setBookingHotels(hotels);
        setSelectedHotel(current => current || hotels[0] || null);
      })
      .catch(() => {
        if (!cancelled) setBookingHotels([]);
      })
      .finally(() => {
        if (!cancelled) setHotelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [destinationSlug]);

  useEffect(() => {
    let cancelled = false;
    setActivitiesLoading(true);
    apiFetch<{ activities: BookingActivity[] }>(`/activities?destination=${encodeURIComponent(destinationSlug)}`)
      .then(data => {
        if (!cancelled) setBookingActivities(data.activities ?? []);
      })
      .catch(() => {
        if (!cancelled) setBookingActivities([]);
      })
      .finally(() => {
        if (!cancelled) setActivitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [destinationSlug]);

  useEffect(() => {
    const query = customPickup.trim();
    if (query.length < 3) {
      setPickupSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      apiFetch<{ predictions: PickupSuggestion[] }>(`/locations/search?destination=${encodeURIComponent(destination.name)}&input=${encodeURIComponent(query)}`)
        .then(data => setPickupSuggestions(data.predictions.slice(0, 5)))
        .catch(() => setPickupSuggestions([]));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [customPickup, destination.name]);

  useEffect(() => {
    const basePrices: Record<string, number> = { Delhi: 5500, Mumbai: 7200, Bangalore: 9500, Kolkata: 8000, Lucknow: 6000, Pune: 7600, Hyderabad: 8200, Chennai: 8700 };
    const basePrice = basePrices[originCity] || 7000;
    const options = [
      { id: "f1", airline: "IndiGo", departureTime: "06:30", arrivalTime: "09:00", duration: "2h 30m", price: basePrice },
      { id: "f2", airline: "Air India", departureTime: "10:15", arrivalTime: "12:55", duration: "2h 40m", price: basePrice + 1200 },
      { id: "f3", airline: "Vistara", departureTime: "16:45", arrivalTime: "19:15", duration: "2h 30m", price: basePrice + 2500 },
    ];
    setFlightsList(options);
    setSelectedFlight(current => current || options[0]);
  }, [originCity]);

  function setStep(nextIndex: number) {
    setDirection(nextIndex > stepIndex ? 1 : -1);
    setStepIndex(Math.min(flowSteps.length - 1, Math.max(0, nextIndex)));
    setSummaryOpen(false);
    setBookingError("");
    setDetailsError("");
  }

  function previousStep() {
    if (hasPrefilledDestinationAndDates && stepIndex <= 2) return;
    setStep(stepIndex - 1);
  }

  function validateStep() {
    if (step === "dates") {
      if (!bookingStartDate || !bookingEndDate || new Date(bookingEndDate) <= new Date(bookingStartDate)) {
        setBookingError("Select valid travel dates to continue.");
        return false;
      }
    }
    if (step === "transport" && selectedTransportType === "Flight" && !selectedFlight) {
      setBookingError("Choose a flight or switch to another transport option.");
      return false;
    }
    if (step === "travellers") {
      if (!traveller.name.trim() || traveller.phone.trim().length < 5 || !traveller.email.trim()) {
        setDetailsError("Please enter a valid name, phone, and email.");
        return false;
      }
    }
    return true;
  }

  function nextStep() {
    setBookingError("");
    setDetailsError("");
    if (!validateStep()) return;
    if (step === "review") {
      void startStripeCheckout();
      return;
    }
    setStep(stepIndex + 1);
  }

  const nextLabel = step === "review" ? (paymentProcessing ? "Opening Stripe..." : "Confirm & Pay") : "Continue";

  function buildBookingPayload() {
    return {
      travelerName: traveller.name,
      email: traveller.email,
      phone: traveller.phone,
      destinationSlug,
      destinationName: destination.name,
      checkInDate: bookingStartDate,
      checkOutDate: bookingEndDate,
      travelMode,
      vehicleId: selectedTransport?.id,
      travelers: adults,
      totalAmount: total,
      pickupLocation: {
        label: selectedPickup?.label || "Custom",
        type: selectedPickup?.type || selectedTransportType,
        address: selectedPickup?.address || customPickup || `${originCity} hub`,
        latitude: selectedPickupCoordinates?.latitude || destinationCoordinates?.latitude || 0,
        longitude: selectedPickupCoordinates?.longitude || destinationCoordinates?.longitude || 0,
      },
      stepPrices: {
        destination: destinationBaseAmount,
        pickup: 0,
        vehicle: groundTransportAmount,
        hotel: hotelAmount,
        flight: flightAmount,
        activities: activitiesAmount,
        meal: mealAmount,
        service: serviceAmount,
      },
    };
  }

  async function startStripeCheckout() {
    if (!user) {
      setBookingError("Please sign in before payment.");
      return;
    }
    setPaymentProcessing(true);
    setBookingError("");
    try {
      const response = await apiFetch<{ checkoutUrl: string; sessionId: string }>("/bookings/transport/checkout", {
        method: "POST",
        body: JSON.stringify(buildBookingPayload()),
      });
      window.location.href = response.checkoutUrl;
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Unable to open Stripe checkout.");
      setPaymentProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[130] overflow-hidden bg-[#F8FAFC] text-[#111827]">
      <div className="flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-slate-200/80 bg-white/95 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-3 px-4 md:px-8 2xl:px-12">
            <button onClick={onClose} aria-label="Close booking" className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 active:scale-95">
              <Icon path="M15 19l-7-7 7-7" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-black text-slate-950">Plan your trip</p>
              <p className="truncate text-xs font-semibold text-slate-500">{destination.name} · {days} days · {adults} travellers</p>
            </div>
            <button onClick={onClose} aria-label="Close booking" className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 active:scale-95">
              <Icon path="M6 18L18 6M6 6l12 12" />
            </button>
          </div>

          <div className="mx-auto flex max-w-[1400px] gap-2 overflow-x-auto px-4 pb-3 md:px-8 2xl:px-12">
            {flowSteps.map((stepName, index) => {
              const done = index < stepIndex;
              const active = index === stepIndex;
              return (
                <button
                  key={stepName}
                  onClick={() => {
                    if (hasPrefilledDestinationAndDates && index < 2) return;
                    if (index <= stepIndex) setStep(index);
                  }}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-black transition ${
                    active
                      ? "border-[#5B4CFF] bg-[#5B4CFF] text-white shadow-sm"
                      : done
                        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {FLOW_LABELS[stepName]}
                  {done && <span>✓</span>}
                </button>
              );
            })}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-40 pt-5 md:px-8 lg:pb-10 lg:pt-8 2xl:px-12">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 32 : -32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -32 : 32 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 xl:gap-10"
            >
              {step === "destination" && (
                <section className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5B4CFF]">Step 1</p>
                  <h2 className="mt-2 text-3xl font-black leading-tight text-slate-950 md:text-4xl">Choose your destination</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Start with a place you love. You can refine dates, stay, and activities in the next steps.</p>

                  <div className="mt-5 flex h-14 items-center gap-3 rounded-[1.5rem] border border-slate-200 bg-white px-4 shadow-sm">
                    <Icon path="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" className="h-5 w-5 text-slate-400" />
                    <input value={destination.name} readOnly className="min-w-0 flex-1 bg-transparent text-base font-bold text-slate-950 outline-none" />
                  </div>

                  <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
                    {POPULAR_TAGS.map(tag => (
                      <span key={tag} className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm ring-1 ring-slate-100">{tag}</span>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {destinationCards.map(card => (
                      <button key={card.name} className={`overflow-hidden rounded-[1.75rem] border bg-white text-left shadow-sm ${card.active ? "border-[#5B4CFF] ring-2 ring-[#5B4CFF]/10" : "border-slate-100"}`}>
                        <div className="relative h-44 md:h-56">
                          <SafeImage src={card.image} alt={card.name} className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
                          <div className="absolute bottom-4 left-4 right-4 text-white">
                            <p className="text-xs font-bold text-white/70">{card.state}</p>
                            <h3 className="mt-1 text-2xl font-black">{card.name}</h3>
                          </div>
                          {card.active && <span className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-black text-[#5B4CFF]">Selected</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {step === "dates" && (
                <section className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5B4CFF]">Step 2</p>
                  <h2 className="mt-2 text-3xl font-black leading-tight text-slate-950 md:text-4xl">Pick travel dates</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Flexible dates help us suggest better packages and prices.</p>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-100">
                      <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Check in</span>
                      <input type="date" min={todayISO()} value={bookingStartDate} onChange={e => setBookingStartDate(e.target.value)} className="mt-2 w-full bg-transparent text-sm font-black text-slate-950 outline-none" />
                    </label>
                    <label className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-100">
                      <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Check out</span>
                      <input type="date" min={nextDate(bookingStartDate)} value={bookingEndDate} onChange={e => setBookingEndDate(e.target.value)} className="mt-2 w-full bg-transparent text-sm font-black text-slate-950 outline-none" />
                    </label>
                  </div>

                  <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                    {DATE_SUGGESTIONS.map((label, index) => (
                      <button
                        key={label}
                        onClick={() => {
                          const offset = index === 0 ? 2 : index === 1 ? 9 : 14;
                          const length = index === 2 ? 5 : 2;
                          const start = nextDate(todayISO(), offset);
                          setBookingStartDate(start);
                          setBookingEndDate(nextDate(start, length));
                        }}
                        className="h-11 shrink-0 rounded-full bg-white px-4 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-100"
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-6">
                    <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-black text-slate-400">
                      {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
                    </div>
                    <div className="mt-3 grid grid-cols-7 gap-2">
                      {Array.from({ length: 21 }).map((_, index) => {
                        const date = nextDate(todayISO(), index + 1);
                        const selected = date >= bookingStartDate && date <= bookingEndDate;
                        return (
                          <button
                            key={date}
                            onClick={() => {
                              setBookingStartDate(date);
                              setBookingEndDate(nextDate(date, 2));
                            }}
                            className={`aspect-square rounded-2xl text-xs font-black ${selected ? "bg-[#5B4CFF] text-white" : "bg-slate-50 text-slate-600"}`}
                          >
                            {new Date(`${date}T00:00:00`).getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {bookingError && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">{bookingError}</p>}
                </section>
              )}

              {step === "transport" && (
                <section className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5B4CFF]">Step 3</p>
                  <h2 className="mt-2 text-3xl font-black leading-tight text-slate-950 md:text-4xl">Choose transport</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Compare the fastest, most comfortable, and most flexible ways to reach {destination.name}.</p>

                  <div className="mt-5 flex gap-2 overflow-x-auto pb-1 md:flex-wrap">
                    {TRANSPORT_TABS.map(tab => (
                      <button
                        key={tab.label}
                        onClick={() => setSelectedTransportType(tab.label)}
                        className={`h-12 shrink-0 rounded-full px-5 text-sm font-black transition ${selectedTransportType === tab.label ? "bg-[#5B4CFF] text-white shadow-sm" : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-100"}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-6">
                    <p className="text-sm font-black text-slate-950">Starting state or union territory</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Search from all Indian states and union territories.</p>
                    <input
                      list="booking-origin-states"
                      value={originCity}
                      onChange={event => setOriginCity(event.target.value)}
                      placeholder="Search state or union territory"
                      className="mt-3 h-12 w-full rounded-2xl bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-[#5B4CFF]/30"
                    />
                    <datalist id="booking-origin-states">
                      {INDIAN_STATES_AND_UTS.map(state => <option key={state} value={state} />)}
                    </datalist>
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {INDIAN_STATES_AND_UTS.slice(0, 8).map(state => (
                        <button key={state} onClick={() => setOriginCity(state)} className="h-10 shrink-0 rounded-full bg-slate-50 px-3 text-xs font-black text-slate-700">
                          {state}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedTransportType === "Flight" ? (
                    <div className="mt-4 grid gap-3 xl:grid-cols-2">
                      {flightsList.map(flight => (
                        <button
                          key={flight.id}
                          onClick={() => setSelectedFlight(flight)}
                          className={`rounded-[1.5rem] border bg-white p-4 text-left shadow-sm ${selectedFlight?.id === flight.id ? "border-[#5B4CFF] ring-2 ring-[#5B4CFF]/10" : "border-slate-100"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-slate-950">{flight.airline}</p>
                              <p className="mt-1 text-xs font-semibold text-slate-500">{flight.duration} · {originCity} to {destination.name}</p>
                            </div>
                            <p className="text-base font-black text-[#5B4CFF]">{formatINR(flight.price)}</p>
                          </div>
                          <div className="mt-4 flex items-center justify-between text-sm font-black text-slate-900">
                            <span>{flight.departureTime}</span>
                            <span className="h-px flex-1 bg-slate-200 mx-4" />
                            <span>{flight.arrivalTime}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : selectedTransportType === "Cab" ? (
                    <div className="mt-4">
                      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                        {(["Normal", "VIP", "VVIP"] as const).map(mode => (
                          <button key={mode} onClick={() => setTravelMode(mode)} className={`h-11 shrink-0 rounded-full px-4 text-xs font-black ${travelMode === mode ? "bg-[#5B4CFF] text-white" : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-100"}`}>{mode}</button>
                        ))}
                      </div>
                      {transportLoading ? (
                        <div className="rounded-[1.5rem] bg-white p-5 text-sm font-semibold text-slate-500 shadow-sm">Loading transport options...</div>
                      ) : (
                        <div className="grid gap-3 xl:grid-cols-2">
                          {(vehicles.length ? vehicles : [{ id: "fallback-cab", mode: travelMode, type: "Cab", name: `${travelMode} private cab`, capacity: adults, price: 3200, description: "Comfortable private transfer", image: "" }]).map(vehicle => (
                            <button key={vehicle.id} onClick={() => setSelectedTransport(vehicle)} className={`rounded-[1.5rem] border bg-white p-4 text-left shadow-sm ${selectedTransport?.id === vehicle.id ? "border-[#5B4CFF] ring-2 ring-[#5B4CFF]/10" : "border-slate-100"}`}>
                              <div className="flex justify-between gap-3">
                                <div>
                                  <p className="text-sm font-black text-slate-950">{vehicle.name}</p>
                                  <p className="mt-1 text-xs font-semibold text-slate-500">{vehicle.capacity} seats · {vehicle.type}</p>
                                </div>
                                <p className="font-black text-[#5B4CFF]">{formatINR(vehicle.price)}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 md:p-6">
                      <p className="text-lg font-black text-slate-950">{selectedTransportType} route</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{selectedTransportMeta?.note}. We will share exact operator details after confirmation.</p>
                      <p className="mt-4 text-2xl font-black text-[#5B4CFF]">{formatINR(selectedTransportMeta?.price || 0)}</p>
                    </div>
                  )}

                  <div className="mt-4 rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-slate-100 md:p-6">
                    <p className="text-sm font-black text-slate-950">Pickup preference</p>
                    <input value={customPickup} onChange={e => setCustomPickup(e.target.value)} placeholder={`Airport, hotel, or pickup in ${destination.name}`} className="mt-3 h-12 w-full rounded-2xl bg-slate-50 px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#5B4CFF]/30" />
                    {pickupSuggestions.length > 0 && (
                      <div className="mt-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
                        {pickupSuggestions.map(suggestion => (
                          <button
                            key={suggestion.placeId || suggestion.description}
                            onClick={() => {
                              setCustomPickup(suggestion.description);
                              setCustomPickupCoords({ latitude: suggestion.latitude, longitude: suggestion.longitude });
                              setPickupSuggestions([]);
                            }}
                            className="block min-h-11 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            {suggestion.description}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {bookingError && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">{bookingError}</p>}
                </section>
              )}

              {step === "stay" && (
                <section className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5B4CFF]">Step 4</p>
                  <h2 className="mt-2 text-3xl font-black leading-tight text-slate-950 md:text-4xl">Pick your stay</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Hotels are loaded from your admin-managed destination database.</p>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {hotelsLoading ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="h-64 animate-pulse rounded-[1.75rem] bg-white shadow-sm ring-1 ring-slate-100" />
                      ))
                    ) : bookingHotels.length === 0 ? (
                      <div className="rounded-[1.75rem] bg-white p-6 text-center shadow-sm ring-1 ring-slate-100 md:col-span-2 xl:col-span-3">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#5B4CFF]/10 text-[#5B4CFF]">
                          <Icon path="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
                        </div>
                        <h3 className="mt-4 text-lg font-black text-slate-950">No hotels added yet</h3>
                        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">Add hotels for {destination.name} from the admin dashboard and they will appear here automatically.</p>
                      </div>
                    ) : bookingHotels.map(hotel => (
                      <button key={hotel.id || hotel.name} onClick={() => setSelectedHotel(hotel)} className={`group overflow-hidden rounded-[1.75rem] border bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${selectedHotel?.name === hotel.name ? "border-[#5B4CFF] ring-2 ring-[#5B4CFF]/10" : "border-slate-100"}`}>
                        <div className="flex gap-3 p-3 md:block">
                          <SafeImage src={hotel.image} alt={hotel.name} className="h-24 w-24 shrink-0 rounded-3xl object-cover transition duration-500 group-hover:scale-[1.03] md:h-44 md:w-full" />
                          <div className="min-w-0 flex-1 py-1 md:p-2">
                            <div className="flex items-start justify-between gap-3">
                              <p className="line-clamp-2 text-sm font-black text-slate-950 md:text-base">{hotel.name}</p>
                              <span className="hidden shrink-0 rounded-full bg-amber-50 px-2 py-1 text-xs font-black text-amber-600 md:inline-flex">Rating {hotel.rating || hotel.stars || 4.5}</span>
                            </div>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{hotel.location || destination.name} · {hotel.rating || hotel.stars || 4.5} rating</p>
                            {hotel.amenities?.length ? (
                              <p className="mt-2 line-clamp-1 text-[11px] font-semibold text-slate-400">{hotel.amenities.slice(0, 3).join(" · ")}</p>
                            ) : null}
                            <p className="mt-3 text-base font-black text-[#5B4CFF]">{hotel.price || formatINR(hotel.pricePerNight || 0)}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {step === "experiences" && (
                <section className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5B4CFF]">Step 5</p>
                  <h2 className="mt-2 text-3xl font-black leading-tight text-slate-950 md:text-4xl">Add experiences</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Activities are loaded based on the selected destination.</p>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {activitiesLoading ? (
                      Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="min-h-[220px] animate-pulse rounded-[1.5rem] bg-white shadow-sm ring-1 ring-slate-100" />
                      ))
                    ) : bookingActivities.length === 0 ? (
                      <div className="rounded-[1.75rem] bg-white p-6 text-center shadow-sm ring-1 ring-slate-100 sm:col-span-2 xl:col-span-3">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#5B4CFF]/10 text-[#5B4CFF]">
                          <Icon path="M13 10V3L4 14h7v7l9-11h-7z" />
                        </div>
                        <h3 className="mt-4 text-lg font-black text-slate-950">No activities added yet</h3>
                        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">Add destination-specific activities for {destination.name} from the admin dashboard.</p>
                      </div>
                    ) : bookingActivities.map(activity => {
                      const key = activity.id || activity.title;
                      const active = selectedActivities.includes(key);
                      return (
                        <button key={key} onClick={() => setSelectedActivities(current => active ? current.filter(item => item !== key) : [...current, key])} className={`group overflow-hidden rounded-[1.5rem] border text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${active ? "border-[#5B4CFF] bg-[#5B4CFF] text-white" : "border-slate-100 bg-white text-slate-900"}`}>
                          <div className="relative h-36 overflow-hidden bg-slate-100">
                            <SafeImage src={activity.image} alt={activity.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                            <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-black ${active ? "bg-white text-[#5B4CFF]" : "bg-white/90 text-slate-700"}`}>{activity.category || "Experience"}</span>
                          </div>
                          <div className="p-4">
                          <p className="line-clamp-2 text-sm font-black leading-tight">{activity.title}</p>
                          <p className={`mt-2 text-xs font-bold ${active ? "text-white/75" : "text-slate-500"}`}>{activity.category || "Experience"} · {activity.duration || "Flexible"}</p>
                          <p className={`mt-3 text-sm font-black ${active ? "text-white" : "text-[#5B4CFF]"}`}>{activity.price || formatINR(activity.amount || 0)} per person</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {step === "travellers" && (
                <section className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5B4CFF]">Details</p>
                  <h2 className="mt-2 text-3xl font-black leading-tight text-slate-950 md:text-4xl">Who is travelling?</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">We use this for booking confirmation and trip support.</p>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <input value={traveller.name} onChange={e => setTraveller(value => ({ ...value, name: e.target.value }))} placeholder="Full name" className="h-14 rounded-[1.25rem] bg-white px-4 text-sm font-semibold shadow-sm outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-[#5B4CFF]/30" />
                    <input value={traveller.phone} onChange={e => setTraveller(value => ({ ...value, phone: e.target.value }))} placeholder="Phone number" className="h-14 rounded-[1.25rem] bg-white px-4 text-sm font-semibold shadow-sm outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-[#5B4CFF]/30" />
                    <input value={traveller.email} onChange={e => setTraveller(value => ({ ...value, email: e.target.value }))} placeholder="Email address" type="email" className="h-14 rounded-[1.25rem] bg-white px-4 text-sm font-semibold shadow-sm outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-[#5B4CFF]/30" />
                    <input value={String(adults)} readOnly placeholder="Travelers" className="h-14 rounded-[1.25rem] bg-white px-4 text-sm font-semibold text-slate-500 shadow-sm outline-none ring-1 ring-slate-100" />
                    <textarea value={traveller.notes} onChange={e => setTraveller(value => ({ ...value, notes: e.target.value }))} placeholder="Requests or notes" className="min-h-28 rounded-[1.25rem] bg-white px-4 py-4 text-sm font-semibold shadow-sm outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-[#5B4CFF]/30 md:col-span-2" />
                  </div>
                  {detailsError && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">{detailsError}</p>}
                </section>
              )}

              {step === "review" && (
                <section className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5B4CFF]">Final step</p>
                  <h2 className="mt-2 text-3xl font-black leading-tight text-slate-950 md:text-4xl">Review & confirm</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Check the essentials before we open secure payment.</p>

                  <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
                    <div className="relative h-44">
                      <SafeImage src={destination.heroImage} alt={destination.name} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 text-white">
                        <p className="text-xs font-bold text-white/70">{bookingStartDate} to {bookingEndDate}</p>
                        <h3 className="mt-1 text-2xl font-black">{destination.name}</h3>
                      </div>
                    </div>
                    <div className="space-y-3 p-4">
                      {summaryRows.map(([label, value, amount]) => (
                        <div key={label} className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 p-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
                            <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-900">{value}</p>
                          </div>
                          {amount > 0 && <p className="shrink-0 text-sm font-black text-[#5B4CFF]">{formatINR(amount)}</p>}
                        </div>
                      ))}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-sm font-black text-slate-950">Trip Total</span>
                        <span className="text-2xl font-black text-[#5B4CFF]">{formatINR(total)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                    <p className="text-sm font-black text-slate-950">Price breakdown</p>
                    <div className="mt-4 space-y-3">
                      {summaryRows.map(([label, , amount]) => amount > 0 && (
                        <div key={label} className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-slate-500">{label}</span>
                          <span className="font-black text-slate-950">{formatINR(amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
                      <span className="text-sm font-black text-slate-950">Trip Total</span>
                      <span className="text-2xl font-black text-[#5B4CFF]">{formatINR(total)}</span>
                    </div>
                  </div>
                  </div>
                  {bookingError && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">{bookingError}</p>}
                </section>
              )}

              <aside className="hidden lg:block">
                <div className="sticky top-[120px] rounded-[2rem] bg-white p-5 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100">
                  <div className="overflow-hidden rounded-[1.5rem]">
                    <div className="relative h-36">
                      <SafeImage src={destination.heroImage} alt={destination.name} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <p className="text-[11px] font-bold text-white/70">{destination.state || "India"}</p>
                        <p className="line-clamp-1 text-lg font-black">{destination.name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Trip summary</p>
                    <div className="mt-3 space-y-2">
                      {summaryRows.map(([label, value, amount]) => (
                        <div key={label} className="rounded-2xl bg-slate-50 p-3">
                          <div className="flex justify-between gap-3 text-xs">
                            <span className="font-black text-slate-400">{label}</span>
                            {amount > 0 && <b className="text-slate-950">{formatINR(amount)}</b>}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-600">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
                    <span className="text-sm font-black text-slate-950">Total</span>
                    <span className="text-2xl font-black text-[#5B4CFF]">{formatINR(total)}</span>
                  </div>

                  <div className="mt-5 grid grid-cols-[0.8fr_1.2fr] gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={previousStep}
                      disabled={stepIndex === 0 || (hasPrefilledDestinationAndDates && stepIndex <= 2)}
                      className="h-12 rounded-2xl border-slate-200 bg-white text-sm font-black text-slate-700 disabled:opacity-40"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={paymentProcessing}
                      className="h-12 rounded-2xl border-[#5B4CFF] bg-[#5B4CFF] text-sm font-black text-white shadow-lg shadow-[#5B4CFF]/20 hover:bg-[#6D5CFF]"
                    >
                      {nextLabel}
                    </Button>
                  </div>
                </div>
              </aside>
            </motion.div>
          </AnimatePresence>
        </main>

        <AnimatePresence>
          {summaryOpen && (
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-x-3 bottom-[calc(92px+env(safe-area-inset-bottom))] z-30 max-h-[55vh] overflow-y-auto rounded-[2rem] bg-white p-4 shadow-2xl ring-1 ring-slate-100 lg:hidden"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Trip total</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{formatINR(total)}</p>
                </div>
                <button onClick={() => setSummaryOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <Icon path="M6 18L18 6M6 6l12 12" className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {summaryRows.map(([label, value, amount]) => (
                  <div key={label} className="rounded-2xl bg-slate-50 p-3">
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="font-black text-slate-400">{label}</span>
                      {amount > 0 && <b className="text-slate-950">{formatINR(amount)}</b>}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-600">{value}</p>
                  </div>
                ))}
              </div>
              {destinationCoordinates && (
                <div className="mt-4 h-40 overflow-hidden rounded-3xl bg-slate-100">
                  <Suspense fallback={<div className="flex h-full items-center justify-center text-xs font-semibold text-slate-500">Loading map...</div>}>
                    <OpenStreetMap points={[{ label: destination.name, latitude: destinationCoordinates.latitude, longitude: destinationCoordinates.longitude }]} center={destinationCoordinates} />
                  </Suspense>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="shrink-0 border-t border-slate-200/80 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden">
          <button onClick={() => setSummaryOpen(value => !value)} className="mb-3 flex h-11 w-full items-center justify-between rounded-2xl bg-slate-50 px-4 text-left">
            <span className="text-xs font-black uppercase tracking-wide text-slate-400">Trip Total</span>
            <span className="text-base font-black text-[#5B4CFF]">{formatINR(total)}</span>
          </button>
          <div className="grid grid-cols-[0.8fr_1.2fr] gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={previousStep}
              disabled={stepIndex === 0 || (hasPrefilledDestinationAndDates && stepIndex <= 2)}
              className="h-12 rounded-2xl border-slate-200 bg-white text-sm font-black text-slate-700 disabled:opacity-40"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={nextStep}
              disabled={paymentProcessing}
              className="h-12 rounded-2xl border-[#5B4CFF] bg-[#5B4CFF] text-sm font-black text-white shadow-lg shadow-[#5B4CFF]/20 hover:bg-[#6D5CFF]"
            >
              {nextLabel}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
