import { useState, useEffect, Suspense, lazy } from "react";
import type { DestinationData, HotelItem, MealPlanItem } from "@/data/destinations";
import { useUser } from "@/context/UserContext";
import { apiFetch } from "@/lib/api";
import { coordinatesForDestination } from "@/lib/geo";
import type { Coordinates } from "@/lib/geo";
import { getBookingConfig, STEP_LABELS, BookingStep } from "@/data/bookingConfig";

const OpenStreetMap = lazy(() => import("@/components/maps/OpenStreetMap"));

export type TransportCategory = { id: string; name: string };
export type VehicleOption = { id: string; mode: string; type: string; name: string; capacity: number; price: number; description: string; image: string };
export type PickupOption = { id: string; label: string; address: string; latitude: number; longitude: number; type: string };
export type PickupSuggestion = { description: string; placeId: string; latitude: number; longitude: number };
export type TravellerForm = { name: string; age: string; phone: string; email: string; notes: string };
export type FlightOption = { id: string; airline: string; departureTime: string; arrivalTime: string; duration: string; price: number };

function daysUntil(date: string) { return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000); }
function tripNights(start: string, end: string) { return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000)); }
function formatINR(amount: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount); }
function parseCurrency(str: string) { return parseInt(str.replace(/[^0-9]/g, ""), 10) || 0; }
function defaultMealPlans(destination: DestinationData): MealPlanItem[] { return destination.meals || []; }

export default function DynamicBookingModal({ 
  destination,
  initialHotel, 
  startDate, 
  endDate, 
  adults, 
  budget = "Mid-range",
  onClose 
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
  const stepOrder = config.steps;
  
  const [stepIndex, setStepIndex] = useState(0);
  const step = stepOrder[stepIndex];

  const hotels = destination.hotels.length ? destination.hotels : [];
  const filteredHotels = hotels; // We'll filter later based on budget if requested
  const mealPlans = destination.meals?.length ? destination.meals : defaultMealPlans(destination);
  
  const [selectedHotel, setSelectedHotel] = useState<HotelItem | null>(initialHotel);
  // Default travel mode based on budget
  const initialMode = budget === "Luxury" ? "VVIP" : budget === "Mid-range" ? "VIP" : "Normal";
  const [travelMode, setTravelMode] = useState<"Normal" | "VIP" | "VVIP">(initialMode);
  
  const [categories, setCategories] = useState<TransportCategory[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [pickupLocations, setPickupLocations] = useState<PickupOption[]>([]);
  const [selectedPickup, setSelectedPickup] = useState<PickupOption | null>(null);
  const [customPickup, setCustomPickup] = useState("");
  const [customPickupCoords, setCustomPickupCoords] = useState<Coordinates | null>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<PickupSuggestion[]>([]);
  const [selectedTransport, setSelectedTransport] = useState<VehicleOption | null>(null);
  const [transportLoading, setTransportLoading] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealPlanItem | null>(null);
  const [traveller, setTraveller] = useState<TravellerForm>({ name: "", age: "", phone: "", email: "", notes: "" });
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingReference, setBookingReference] = useState("");
  
  // Custom new steps mock states
  const [originCity, setOriginCity] = useState("");
  const [selectedFlight, setSelectedFlight] = useState<FlightOption | "skipped" | null>(null);
  const [flightsList, setFlightsList] = useState<FlightOption[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  const nights = tripNights(startDate, endDate);
  const days = nights;
  const destinationBaseAmount = Math.max(3500, days * adults * 1200);
  const destinationAmount = stepIndex > 0 ? destinationBaseAmount : 0;
  const hotelAmount = selectedHotel ? parseCurrency(selectedHotel.price) : 0;
  const pickupAmount = 0;
  const transportAmount = selectedTransport ? selectedTransport.price : 0;
  const flightAmount = selectedFlight && selectedFlight !== "skipped" ? selectedFlight.price * adults : 0;
  const activitiesAmount = selectedActivities.length * 1500 * adults;
  const mealAmount = selectedMeal ? parseCurrency(selectedMeal.price) * days * adults : 0;
  const subtotal = destinationAmount + pickupAmount + transportAmount + mealAmount + hotelAmount + flightAmount + activitiesAmount;
  const serviceAmount = 0;
  const total = subtotal + serviceAmount;
  const journeyDaysLeft = Math.max(0, daysUntil(startDate));
  const destinationCoordinates = coordinatesForDestination(destination);
  const selectedPickupCoordinates = selectedPickup
    ? { latitude: selectedPickup.latitude, longitude: selectedPickup.longitude }
    : customPickupCoords;

  function goNext() {
    setDetailsError("");
    setStepIndex(i => Math.min(stepOrder.length - 1, i + 1));
  }

  function previousStep() {
    setStepIndex(i => Math.max(0, i - 1));
  }

  function nextStep() {
    if (step === "destination") { goNext(); return; }
    if (step === "origin") {
      if (!originCity) {
        setBookingError("Please select an origin city to continue.");
        return;
      }
      goNext();
      return;
    }
    if (step === "transport_pickup") {
      if (stepOrder.includes("transport_pickup") && !selectedTransport) {
        setBookingError("Please select a vehicle to continue.");
        return;
      }
      goNext();
      return;
    }
    if (step === "hotel") { goNext(); return; }
    if (step === "flight") { 
      if (!selectedFlight) {
        setBookingError("Please select a flight or choose to skip.");
        return;
      }
      goNext(); 
      return; 
    }
    if (step === "activities") { goNext(); return; }
    if (step === "travellers" || step === "details") {
      if (!traveller.name.trim() || traveller.phone.trim().length < 5 || !traveller.email.trim()) {
        setDetailsError("Please enter a valid name, phone (min 5 chars), and email.");
        return;
      }
      goNext();
      return;
    }
    if (step === "payment") {
      void startStripeCheckout();
    }
  }

  const canContinue = true; // Simplified for dynamic approach, handled by nextStep validation
  const nextLabel = step === "payment" ? (paymentProcessing ? "Opening Stripe..." : "Pay with Stripe") : (stepIndex === stepOrder.length - 1 ? "Done" : "Next");

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
    return () => { cancelled = true; };
  }, [destinationSlug, travelMode]);

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
    if (step === "flight" && originCity) {
      // Generate mock flights
      const basePrices: Record<string, number> = { "Delhi": 5500, "Mumbai": 7200, "Bangalore": 9500, "Kolkata": 8000, "Lucknow": 6000 };
      const basePrice = basePrices[originCity] || 7000;
      setFlightsList([
        { id: "f1", airline: "IndiGo", departureTime: "06:30 AM", arrivalTime: "09:00 AM", duration: "2h 30m", price: basePrice },
        { id: "f2", airline: "Air India", departureTime: "10:15 AM", arrivalTime: "12:55 PM", duration: "2h 40m", price: basePrice + 1200 },
        { id: "f3", airline: "Vistara", departureTime: "04:45 PM", arrivalTime: "07:15 PM", duration: "2h 30m", price: basePrice + 2500 },
      ]);
    }
  }, [step, originCity]);

  function buildBookingPayload() {
    return {
      travelerName: traveller.name,
      email: traveller.email,
      phone: traveller.phone,
      destinationSlug,
      destinationName: destination.name,
      checkInDate: startDate,
      checkOutDate: endDate,
      travelMode,
      vehicleId: selectedTransport?.id,
      travelers: adults,
      totalAmount: total,
      pickupLocation: {
        label: selectedPickup?.label || "Custom",
        type: selectedPickup?.type || "Custom Location",
        address: selectedPickup?.address || customPickup || "Airport / Hub",
        latitude: selectedPickupCoordinates?.latitude || destinationCoordinates?.latitude || 0,
        longitude: selectedPickupCoordinates?.longitude || destinationCoordinates?.longitude || 0,
      },
      stepPrices: {
        destination: destinationAmount,
        pickup: pickupAmount,
        vehicle: transportAmount,
        hotel: hotelAmount,
        flight: flightAmount,
        activities: activitiesAmount,
        meal: mealAmount,
        service: serviceAmount,
      },
    };
  }

  async function startStripeCheckout() {
    if (!user) { setBookingError("Please sign in before payment."); return; }
    const payload = buildBookingPayload();
    setPaymentProcessing(true);
    setBookingError("");
    try {
      const response = await apiFetch<{ checkoutUrl: string; sessionId: string }>("/bookings/transport/checkout", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      window.location.href = response.checkoutUrl;
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Unable to open Stripe checkout.");
      setPaymentProcessing(false);
    }
  }

  const summaryRows = [
    ["Destination", `${destination.name} plan`, destinationAmount],
    ...(stepOrder.includes("transport_pickup") ? [["Pickup", selectedPickup?.label || customPickup || "Not selected", pickupAmount], ["Vehicle", selectedTransport ? `${selectedTransport.mode} - ${selectedTransport.name}` : "Not selected", transportAmount]] : []),
    ...(stepOrder.includes("flight") ? [["Flight", selectedFlight === "skipped" ? "Skipped" : selectedFlight ? `${selectedFlight.airline} (${originCity} → ${destination.name})` : "Not selected", flightAmount]] : []),
    ...(stepOrder.includes("hotel") ? [["Hotel", selectedHotel?.name || "Not selected", hotelAmount]] : []),
    ...(stepOrder.includes("activities") ? [["Activities", `${selectedActivities.length} selected`, activitiesAmount]] : []),
    ...(serviceAmount > 0 ? [["Taxes & Fees", "Explicit service/tax charges", serviceAmount]] : []),
  ];

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <div className="relative h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        {step === "confirmation" || step === "done" ? (
          <div className="grid md:grid-cols-[1fr_0.8fr]">
            <div className="p-8 sm:p-10">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
              <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-indigo-500">Trip Confirmed</p>
              <h2 className="mt-3 text-4xl font-black leading-tight text-stone-950">Your journey is set.</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-stone-500">Pack your bag and enjoy every moment.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {summaryRows.map(([label, value, amount]) => (
                  <div key={String(label)} className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">{label}</p>
                    <p className="mt-1 text-sm font-bold text-stone-900">{value}</p>
                    <p className="mt-2 text-sm font-black text-indigo-600">{formatINR(Number(amount))}</p>
                  </div>
                ))}
              </div>
              <button onClick={onClose} className="mt-8 rounded-full bg-indigo-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700">Done</button>
            </div>
            <div className="relative min-h-[420px]">
              <img src={destination.heroImage} alt={destination.name} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            </div>
          </div>
        ) : (
          <div className="grid h-full min-h-0 md:grid-cols-[1fr_340px]">
            <div className="flex min-h-0 flex-col">
              <div className="border-b border-stone-100 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500">Book your trip</p>
                    <h2 className="mt-1 text-2xl font-black text-stone-950">Dynamic Booking Flow</h2>
                  </div>
                  <button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xl text-stone-500 hover:bg-stone-200">×</button>
                </div>
                <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
                  {stepOrder.map((stepName, index) => (
                    <div key={stepName} className={`h-2 min-w-[40px] flex-1 rounded-full ${index <= stepIndex ? "bg-indigo-600" : "bg-stone-100"}`} title={STEP_LABELS[stepName]} />
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                {step === "destination" && (
                  <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-6">
                    <p className="text-xs font-bold uppercase tracking-wide text-indigo-500">Step 1</p>
                    <h3 className="mt-2 text-3xl font-black text-stone-950">Book your destination first</h3>
                    <p className="mt-3 text-sm leading-7 text-stone-600">This confirms the trip route for {destination.name}.</p>
                    <div className="mt-5 rounded-2xl bg-white p-4">
                      <div className="flex justify-between text-sm"><span>{days} days · {adults} adults</span><b>{formatINR(destinationBaseAmount)}</b></div>
                    </div>
                  </div>
                )}

                {step === "origin" && (
                  <div>
                     <h3 className="text-2xl font-black text-stone-950">Where are you starting from?</h3>
                     <p className="mt-2 text-sm text-stone-500">Select your departure state to find the best routes to {destination.name}.</p>
                     <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2 pb-2">
                        {[
                          "Andaman & Nicobar", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", 
                          "Dadra & Nagar Haveli", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu & Kashmir", 
                          "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", 
                          "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
                          "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
                        ].map(city => (
                           <button 
                             key={city} 
                             onClick={() => { setOriginCity(city); setBookingError(""); }} 
                             className={`rounded-2xl border p-3 text-sm text-center font-bold transition-all ${originCity === city ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200" : "border-stone-100 bg-white text-stone-700 hover:border-indigo-200"}`}
                           >
                             {city}
                           </button>
                        ))}
                     </div>
                     {bookingError && <p className="mt-4 text-sm font-semibold text-rose-500">{bookingError}</p>}
                  </div>
                )}

                {(step === "transport_pickup") && (
                  <div>
                    <h3 className="text-2xl font-black text-stone-950">Transport & Pickup</h3>
                    <div className="mt-5 grid grid-cols-3 gap-3">
                      {(["Normal", "VIP", "VVIP"] as const).map(mode => (
                        <button key={mode} onClick={() => setTravelMode(mode)} className={`rounded-2xl border px-4 py-4 text-sm font-black ${travelMode === mode ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-stone-100 bg-white text-stone-600"}`}>{mode}</button>
                      ))}
                    </div>
                    <div className="mt-5">
                      {transportLoading ? <p>Loading...</p> : (
                        <div className="grid gap-3">
                          {vehicles.map(vehicle => (
                            <button key={vehicle.id} onClick={() => { setSelectedTransport(vehicle); setBookingError(""); }} className={`rounded-2xl border p-4 text-left ${selectedTransport?.id === vehicle.id ? "border-indigo-500 bg-indigo-50" : "border-stone-100 bg-white"}`}>
                              <b className="text-stone-950">{vehicle.name}</b>
                              <span className="ml-2 font-black text-indigo-600">{formatINR(vehicle.price)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                       <input value={customPickup} onChange={e => setCustomPickup(e.target.value)} placeholder={`Custom pickup in ${destination.name}`} className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
                       {pickupSuggestions.length > 0 && (
                         <div className="mt-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm">
                           {pickupSuggestions.map(s => (
                             <button
                               key={s.placeId || s.description}
                               onClick={() => {
                                 setCustomPickup(s.description);
                                 setCustomPickupCoords({ latitude: s.latitude, longitude: s.longitude });
                                 setPickupSuggestions([]);
                               }}
                               className="block w-full rounded-xl px-4 py-2 text-left text-sm hover:bg-stone-50"
                             >
                               {s.description}
                             </button>
                           ))}
                         </div>
                       )}
                    </div>
                    {bookingError && <p className="mt-4 text-sm font-semibold text-rose-500">{bookingError}</p>}
                  </div>
                )}

                {step === "flight" && (
                  <div>
                     <div className="flex items-center justify-between">
                       <div>
                         <h3 className="text-2xl font-black text-stone-950">Select Flights</h3>
                         <p className="mt-1 text-sm font-semibold text-indigo-600">{originCity} → {destination.name}</p>
                       </div>
                       <button 
                         type="button"
                         onClick={() => { setSelectedFlight("skipped"); setBookingError(""); setTimeout(goNext, 0); }} 
                         className={`text-sm font-bold px-4 py-2 rounded-full border cursor-pointer transition-all ${selectedFlight === "skipped" ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-500 border-stone-200 hover:bg-stone-100"}`}
                       >
                         Skip flights
                       </button>
                     </div>
                     <div className="mt-6 grid gap-4">
                        {flightsList.map(f => (
                           <button 
                             key={f.id} 
                             onClick={() => { setSelectedFlight(f); setBookingError(""); }} 
                             className={`rounded-3xl border p-5 text-left transition-all ${selectedFlight && selectedFlight !== "skipped" && selectedFlight.id === f.id ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200" : "border-stone-100 bg-white hover:border-indigo-200"}`}
                           >
                             <div className="flex justify-between items-start mb-4">
                               <div className="font-bold text-stone-900">{f.airline}</div>
                               <div className="font-black text-lg text-indigo-700">{formatINR(f.price)}</div>
                             </div>
                             <div className="flex items-center justify-between text-sm">
                               <div className="text-center">
                                 <div className="font-black text-stone-900">{f.departureTime}</div>
                                 <div className="text-xs text-stone-500 font-semibold">{originCity}</div>
                               </div>
                               <div className="flex-1 px-4 flex items-center justify-center relative">
                                 <div className="absolute w-full h-[1px] bg-stone-300"></div>
                                 <span className="bg-white px-2 text-xs font-semibold text-stone-500 relative z-10">{f.duration}</span>
                               </div>
                               <div className="text-center">
                                 <div className="font-black text-stone-900">{f.arrivalTime}</div>
                                 <div className="text-xs text-stone-500 font-semibold">{destination.name}</div>
                               </div>
                             </div>
                           </button>
                        ))}
                     </div>
                     {bookingError && <p className="mt-4 text-sm font-semibold text-rose-500">{bookingError}</p>}
                  </div>
                )}

                {step === "activities" && (
                  <div>
                     <h3 className="text-2xl font-black text-stone-950">Select Activities</h3>
                     <p className="mt-2 text-sm text-stone-500">Top activities for {destination.name}</p>
                     <div className="mt-4 grid gap-3">
                        {["City Tour", "Boat Cruise", "Adventure Trek"].map(f => {
                           const active = selectedActivities.includes(f);
                           return <button key={f} onClick={() => setSelectedActivities(curr => active ? curr.filter(x => x !== f) : [...curr, f])} className={`rounded-2xl border p-4 text-left ${active ? "border-indigo-500 bg-indigo-50" : "border-stone-100 bg-white"}`}>{f} - {formatINR(1500)}</button>
                        })}
                     </div>
                  </div>
                )}

                {step === "hotel" && (
                  <div>
                    <h3 className="text-2xl font-black text-stone-950">Choose hotel</h3>
                    <p className="mt-1 text-sm text-stone-500">Filtered for {budget} budget.</p>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      {filteredHotels.map(hotel => (
                        <button key={hotel.name} onClick={() => setSelectedHotel(hotel)} className={`overflow-hidden rounded-3xl border text-left transition-all ${selectedHotel?.name === hotel.name ? "border-indigo-500 bg-indigo-50" : "border-stone-100 bg-white"}`}>
                          <img src={hotel.image} alt={hotel.name} className="h-44 w-full object-cover" />
                          <div className="p-4"><h4 className="font-black text-stone-950">{hotel.name}</h4><b className="text-indigo-600">{hotel.price}</b></div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(step === "details" || step === "travellers") && (
                  <div>
                    <h3 className="text-2xl font-black text-stone-950">Traveller details</h3>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <input value={traveller.name} onChange={e => setTraveller(v => ({ ...v, name: e.target.value }))} placeholder="Full name" className="rounded-2xl border px-4 py-3 text-sm" />
                      <input value={traveller.phone} onChange={e => setTraveller(v => ({ ...v, phone: e.target.value }))} placeholder="Phone number" className="rounded-2xl border px-4 py-3 text-sm" />
                      <input value={traveller.email} onChange={e => setTraveller(v => ({ ...v, email: e.target.value }))} placeholder="Email" type="email" className="rounded-2xl border px-4 py-3 text-sm" />
                    </div>
                    {detailsError && <p className="mt-3 text-sm font-semibold text-rose-500">{detailsError}</p>}
                  </div>
                )}

                {step === "payment" && (
                  <div>
                    <h3 className="text-2xl font-black text-stone-950">Secure Payment</h3>
                    <div className="mt-6 rounded-3xl bg-stone-50 p-5">
                      <div className="flex justify-between"><span className="font-bold text-stone-700">Payable amount</span><span className="text-3xl font-black text-indigo-600">{formatINR(total)}</span></div>
                    </div>
                    {bookingError && <p className="mt-4 text-sm font-semibold text-rose-500">{bookingError}</p>}
                  </div>
                )}
              </div>
              <div className="sticky bottom-0 z-20 flex shrink-0 items-center justify-between gap-3 border-t border-stone-100 bg-white px-6 py-4">
                <button onClick={previousStep} disabled={stepIndex === 0} className="rounded-full border border-stone-200 px-5 py-3 text-sm font-bold text-stone-600 hover:bg-stone-50 disabled:opacity-40">Back</button>
                <button onClick={nextStep} disabled={!canContinue} className="rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40">{nextLabel}</button>
              </div>
            </div>

            <aside className="min-h-0 overflow-y-auto border-l border-stone-100 bg-stone-50 p-5">
              <p className="text-xs font-black uppercase tracking-wide text-stone-400">Trip total</p>
              <p className="mt-2 text-3xl font-black text-stone-950">{formatINR(total)}</p>
              <div className="mt-5 space-y-3">
                {summaryRows.map(([label, value, amount]) => (
                  <div key={String(label)} className="rounded-2xl bg-white p-3">
                    <div className="flex justify-between gap-3 text-xs"><span className="font-bold text-stone-400">{label}</span><b className="text-stone-900">{formatINR(Number(amount))}</b></div>
                    <p className="mt-1 text-xs text-stone-600">{value}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
