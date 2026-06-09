import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { FormEvent } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/context/UserContext";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";


// ── Types ──────────────────────────────────────────────────────────────────
interface AdminStats  { users: number; reviews: number; wishlistItems: number; destinations: number; publishedDestinations?: number; staticDestinations?: number; liveDestinations?: number; }
interface AdminUser   { id: string; name: string; email: string; avatar: string | null; createdAt: string; reviewCount: number; wishlistCount: number; }
interface AdminReview { id: string; userId: string; destId: string; authorName: string; tripType: string; rating: number; title: string; review: string; photos?: string[]; helpful: number; createdAt: string; }
interface AdminInquiry { id: string; name: string; email: string; phone: string; destination: string; travelDates: string; message: string; status: "Pending" | "Replied";  replyMessage?: string;
  createdAt: string;
  notificationDelivered?: boolean;
  notificationRead?: boolean;
  notificationEmailSent?: boolean;
};
interface AdminActivityItem { title: string; category: string; duration: string; price: string; image: string; badge?: string | null; }
interface AdminPackage { id: string; title: string; duration: string; price: number; coverImage: string; rating: number; featured: boolean; status: string; destinationId?: { name: string }; }
interface TransportPlanItem { tier: string; title: string; vehicles: string; price: string; description: string; image?: string | null; }
interface MealPlanItem { tier: string; title: string; includes: string; price: string; description: string; image?: string | null; }
interface CustomDest  { id: string; slug: string; name: string; city: string; state: string; stateSlug: string; country: string; region: string; heroImage: string; images: string[]; photos?: string[]; tagline: string; rating: number; latitude?: number; longitude?: number; reviewCount: number; climateLabel: string; climate?: string; tags: string[]; about: string; isPublished: boolean; activities?: AdminActivityItem[]; hotels?: any[]; transports?: TransportPlanItem[]; meals?: MealPlanItem[]; flights?: any[]; trains?: any[]; createdAt: string; updatedAt?: string; }
interface AdminActivityUser {
  user: { id: string; name: string; email: string; avatar: string | null; createdAt: string };
  wishlist: {
    destinations: Array<{ destId: string; name: string; state: string; heroImage: string; rating: number; region: string; tagline: string }>;
    activities: Array<{ destId: string; destName: string; title: string; category: string; duration: string; price: string; image: string }>;
    hotels: Array<{ destId: string; destName: string; name: string; stars: number; price: string; image: string; tag: string }>;
  };
  reviews: AdminReview[];
  totals: { destinations: number; activities: number; hotels: number; reviews: number };
}
interface AdminTimelineItem { id: string; type: string; userId: string; userName: string; label: string; detail: string; createdAt: string; }
interface AdminActivityResponse { users: AdminActivityUser[]; timeline: AdminTimelineItem[]; }
interface TransportCategory { id: string; name: string; mode: "Normal" | "VIP" | "VVIP"; description: string; isActive: boolean; }
interface VehicleOption { id: string; categoryId: string; mode: "Normal" | "VIP" | "VVIP"; name: string; type: string; price: number; capacity: number; image?: string; description: string; isAvailable: boolean; }
interface PickupLocationOption { id: string; destinationSlug: string; destinationName: string; label: string; type: string; address: string; latitude: number; longitude: number; isActive: boolean; }
interface TransportBooking { id: string; travelerName: string; travelerAge: number; email: string; phone: string; destinationSlug: string; destinationName: string; checkInDate: string; checkOutDate: string; pickupLocation: { label: string; type: string; address: string; latitude: number; longitude: number }; travelMode: "Normal" | "VIP" | "VVIP"; vehicle: { id: string; name: string; type: string; price: number; capacity: number }; travelers: number; totalAmount: number; status: "Pending" | "Assigned" | "Picked Up" | "In Progress" | "Completed"; assignedDriver: string; assignedStaff: string; assignmentConfirmed?: boolean; assignmentConfirmedAt?: string; bookingReference: string; createdAt: string; }
interface TransportAdminData { categories: TransportCategory[]; vehicles: VehicleOption[]; pickupLocations: PickupLocationOption[]; bookings: TransportBooking[]; }

type Tab = "overview" | "activity" | "users" | "reviews" | "destinations" | "packages" | "transport" | "inquiries" | "stories";

// ── Helpers ────────────────────────────────────────────────────────────────
const GRADIENTS = ["from-indigo-500 to-sky-400","from-violet-500 to-purple-400","from-rose-500 to-pink-400","from-emerald-500 to-teal-400","from-amber-500 to-orange-400","from-sky-500 to-cyan-400"];
const FALLBACK_DEST_IMAGE = "/images/unsplash-bd9404f5e774.jpg";
function getGradient(name: string) { const c = name.split("").reduce((a,ch) => a + ch.charCodeAt(0), 0); return GRADIENTS[c % GRADIENTS.length]; }
function getInitials(name: string) { const p = name.trim().split(/\s+/); return p.length >= 2 ? (p[0][0]+p[1][0]).toUpperCase() : (p[0]?.[0] ?? "?").toUpperCase(); }
function toSlug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}); }
function imageSrc(value?: string | null) { return value && value.trim() ? value : FALLBACK_DEST_IMAGE; }
function hasAnyValue(item: Record<string, unknown>, keys: string[]) {
  return keys.some(key => String(item[key] ?? "").trim().length > 0);
}
function requireFields(item: Record<string, unknown>, keys: string[]) {
  return keys.every(key => String(item[key] ?? "").trim().length > 0);
}
function cleanOptional(value?: string | null) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
}
function aboutToText(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const about = value as { para1?: unknown; para2?: unknown; heading?: unknown };
    return [about.para1, about.para2].map(item => String(item ?? "").trim()).filter(Boolean).join("\n\n")
      || String(about.heading ?? "");
  }
  return "";
}
async function uploadMediaToCloudinary(file: File, folder = "wandr/admin-destinations") {
  const signatureRes = await fetch("/api/storage/cloudinary/signature", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder }),
  });
  if (!signatureRes.ok) {
    const data = await signatureRes.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error || "Cloudinary signature failed");
  }

  const signed = await signatureRes.json() as {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    folder: string;
    signature: string;
  };

  const form = new FormData();
  form.set("file", file);
  form.set("api_key", signed.apiKey);
  form.set("timestamp", String(signed.timestamp));
  form.set("folder", signed.folder);
  form.set("signature", signed.signature);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`, {
    method: "POST",
    body: form,
  });
  const data = await uploadRes.json().catch(() => ({})) as { secure_url?: string; error?: { message?: string } };
  if (!uploadRes.ok || !data.secure_url) {
    throw new Error(data.error?.message || "Cloudinary upload failed");
  }
  const isVideo = file.type.startsWith("video/");
  if (isVideo) {
    return data.secure_url.replace("/upload/", "/upload/f_auto,q_auto/");
  }
  return data.secure_url.replace("/upload/", "/upload/f_auto,q_auto,c_limit,w_1600/");
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <svg key={n} className={`w-3 h-3 ${n<=rating?"fill-amber-400 text-amber-400":"fill-stone-200 text-stone-200"}`} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </div>
  );
}

function StatCard({ icon, label, value, bg, badge, badgeColor }: { icon: string; label: string; value: number; bg: string; badge?: string; badgeColor?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex items-center gap-4 relative overflow-hidden">
      <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center text-xl flex-shrink-0`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-extrabold text-stone-900 truncate">{value.toLocaleString()}</div>
          {badge && <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${badgeColor}`}>{badge}</span>}
        </div>
        <div className="text-xs text-stone-400 font-medium mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ── Destination Modal ──────────────────────────────────────────────────────
export function isVideoUrl(url?: string) {
  if (!url) return false;
  return url.match(/\.(mp4|webm|ogg)$/i) || url.includes("/video/upload/");
}

function ImageSlot({ index, url, uploading, onPick, onRemove }: { index: number; url: string; uploading: boolean; onPick: (index: number, file: File) => void; onRemove: (index: number) => void; }) {
  const ref = useRef<HTMLInputElement>(null);
  const isHero = index === 0;
  return (
    <div
      className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group ${url ? "border-transparent shadow-md" : "border-dashed border-stone-200 bg-stone-50 hover:border-indigo-400 hover:bg-indigo-50/30"}`}
      onClick={() => !url && ref.current?.click()}
    >
      {url ? (
        <>
          {isVideoUrl(url) ? (
            <video src={url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
          ) : (
            <img src={url} alt={`Media ${index+1}`} className="w-full h-full object-cover"/>
          )}
          {isHero && (
            <span className="absolute top-1.5 left-1.5 text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">HERO</span>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"/>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onRemove(index); }}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); ref.current?.click(); }}
            className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-500"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          </button>
        </>
      ) : uploading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <svg className="w-6 h-6 text-indigo-500 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span className="text-xs text-indigo-500 font-medium">Uploading…</span>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-stone-300">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/></svg>
          <span className="text-[10px] font-semibold uppercase tracking-wide">{isHero ? "Hero" : `Media ${index+1}`}</span>
        </div>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) { onPick(index, e.target.files[0]); e.target.value = ""; } }}
      />
    </div>
  );
}

function DestModal({ initial, onSave, onClose }: { initial: CustomDest | null; onSave: (data: Record<string, unknown>, id?: string) => Promise<void>; onClose: () => void; }) {
  const [name,         setName]        = useState(initial?.name ?? "");
  const [slug,         setSlug]        = useState(initial?.slug ?? "");
  const [slugLocked,   setSlugLocked]  = useState(!!initial);
  const [city,         setCity]        = useState(initial?.city ?? "");
  const [state,        setState]       = useState(initial?.state ?? "");
  const [country,      setCountry]     = useState(initial?.country ?? "India");
  const [region,       setRegion]      = useState(initial?.region ?? "");
  const [images,       setImages]      = useState<string[]>(
    initial?.images?.length ? initial.images : initial?.heroImage ? [initial.heroImage] : []
  );
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [tagline,      setTagline]     = useState(initial?.tagline ?? "");
  const [rating,       setRating]      = useState(initial?.rating ?? 4.5);
  const [latitude,     setLatitude]    = useState(String(initial?.latitude ?? ""));
  const [longitude,    setLongitude]   = useState(String(initial?.longitude ?? ""));
  const [reviewCount,  setRevCount]    = useState(initial?.reviewCount ?? 0);
  const [climate,      setClimate]     = useState(initial?.climateLabel ?? "");
  const [tagsStr,      setTagsStr]     = useState(initial?.tags?.join(", ") ?? "");
  const [about,        setAbout]       = useState(aboutToText(initial?.about));
  const [published,    setPublished]   = useState(initial?.isPublished ?? true);
  const [activities,   setActivities]  = useState<AdminActivityItem[]>(initial?.activities ?? []);
  const [uploadingActSlot, setUploadingActSlot] = useState<number | null>(null);
  const [hotels,       setHotels]      = useState<any[]>(initial?.hotels ?? []);
  const [uploadingHotelSlot, setUploadingHotelSlot] = useState<number | null>(null);
  const [transports,   setTransports]  = useState<TransportPlanItem[]>(initial?.transports ?? []);
  const [meals,        setMeals]       = useState<MealPlanItem[]>(initial?.meals ?? []);
  const [flights,      setFlights]     = useState<any[]>(initial?.flights ?? []);
  const [trains,       setTrains]      = useState<any[]>(initial?.trains ?? []);
  const [transfers,    setTransfers]   = useState<any[]>(initial?.transfers ?? []);
  const [modalTab,     setModalTab]    = useState<"basic" | "activities" | "hotels" | "transport" | "meals" | "flights" | "trains" | "transfers">("basic");
  const [saving,       setSaving]      = useState(false);
  const [error,        setError]       = useState("");

  useEffect(() => { if (!slugLocked) setSlug(toSlug(name)); }, [name, slugLocked]);
  useEffect(() => { if (!city && name) setCity(name); }, [name, city]);

  const inp = "w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition";
  const lbl = "block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5";

  async function handleImagePick(slotIndex: number, file: File) {
    setError("");
    setUploadingSlot(slotIndex);
    try {
      const serveUrl = await uploadMediaToCloudinary(file, "wandr/destinations");
      setImages(prev => {
        const next = [...prev];
        if (slotIndex < next.length) { next[slotIndex] = serveUrl; }
        else { next.push(serveUrl); }
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image upload failed.");
    } finally {
      setUploadingSlot(null);
    }
  }

  function handleImageRemove(index: number) {
    setImages(prev => prev.filter((_, i) => i !== index));
  }

  async function handleActivityImagePick(index: number, file: File) {
    setUploadingActSlot(index);
    try {
      const serveUrl = await uploadMediaToCloudinary(file, "wandr/activities");
      setActivities(prev => {
        const next = [...prev];
        next[index] = { ...next[index], image: serveUrl };
        return next;
      });
    } catch (e) {
      setError("Activity image upload failed.");
    } finally {
      setUploadingActSlot(null);
    }
  }

  function addActivity() {
    setActivities(prev => [...prev, { title: "", category: "", duration: "", price: "", image: "", badge: "" }]);
  }

  async function handleHotelImagePick(index: number, file: File) {
    setUploadingHotelSlot(index);
    try {
      const serveUrl = await uploadMediaToCloudinary(file, "wandr/hotels");
      setHotels(prev => {
        const next = [...prev];
        next[index] = { ...next[index], image: serveUrl };
        return next;
      });
    } catch (e) {
      setError("Hotel image upload failed.");
    } finally {
      setUploadingHotelSlot(null);
    }
  }

  function addHotel() { setHotels(prev => [...prev, { name: "", stars: 5, price: "", perNight: "night", image: "", tag: "" }]); }
  function addTransport() { setTransports(prev => [...prev, { tier: "Normal", title: "", vehicles: "", price: "", description: "", image: "" }]); }
  function addMeal() { setMeals(prev => [...prev, { tier: "Normal", title: "", includes: "", price: "", description: "", image: "" }]); }
  function addFlight() { setFlights(prev => [...prev, { from: "", code: "", flag: "🇮🇳", airline: "", duration: "", frequency: "", price: "", direct: true }]); }
  function addTrain() { setTrains(prev => [...prev, { from: "", duration: "", type: "", operator: "", price: "", icon: "🚆", note: "" }]); }
  function addTransfer() { setTransfers(prev => [...prev, { type: "", desc: "", duration: "", price: "", icon: "🚗", recommended: false }]); }

  async function handleSave() {
    if (!name || !slug || !city || !state || !region || !tagline) { setError("Fill in all required (*) fields."); return; }
    if (images.length === 0) { setError("Upload at least one destination image."); return; }
    const cleanedTransports = transports
      .filter(item => hasAnyValue(item as unknown as Record<string, unknown>, ["title", "vehicles", "price", "description", "image"]))
      .map(item => ({ ...item, image: cleanOptional(item.image) }));
    const incompleteTransport = cleanedTransports.find(item => !requireFields(item as unknown as Record<string, unknown>, ["tier", "title", "vehicles", "price", "description"]));
    if (incompleteTransport) { setError("Complete all required transport fields, or delete the empty transport row."); return; }

    const cleanedMeals = meals
      .filter(item => hasAnyValue(item as unknown as Record<string, unknown>, ["title", "includes", "price", "description", "image"]))
      .map(item => ({ ...item, image: cleanOptional(item.image) }));
    const incompleteMeal = cleanedMeals.find(item => !requireFields(item as unknown as Record<string, unknown>, ["tier", "title", "includes", "price", "description"]));
    if (incompleteMeal) { setError("Complete all required meal fields, or delete the empty meal row."); return; }

    setSaving(true); setError("");
    try {
      await onSave({ name, slug, city, state, country, region, images, photos: images, tagline, rating: +rating, latitude: latitude.trim() ? Number(latitude) : null, longitude: longitude.trim() ? Number(longitude) : null, reviewCount: +reviewCount, climateLabel: climate, climate, tags: tagsStr.split(",").map(t=>t.trim()).filter(Boolean), about, isPublished: published, activities, hotels, transports: cleanedTransports, meals: cleanedMeals, flights, trains, transfers }, initial?.id);
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to save."); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-stone-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-extrabold text-stone-900">{initial ? "Edit Destination" : "Add New Destination"}</h2>
            <p className="text-xs text-stone-400 mt-0.5">Fill in the details below and upload photos</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-7 pt-4 border-b border-stone-100 flex-shrink-0 gap-6 text-sm font-bold overflow-x-auto hide-scrollbar">
          {(["basic", "activities", "hotels", "flights", "trains", "transfers"] as const).map(t => {
            const count = t === "activities" ? activities.length : t === "hotels" ? hotels.length : t === "flights" ? flights.length : t === "trains" ? trains.length : t === "transfers" ? transfers.length : null;
            return (
              <button key={t} type="button" onClick={() => setModalTab(t)} className={`py-3 capitalize whitespace-nowrap transition-colors border-b-2 ${modalTab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-stone-400 hover:text-stone-600"}`}>
                {t} {count !== null && `(${count})`}
              </button>
            );
          })}
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-7 py-6 flex-1 min-h-0">
          
          <div className={`space-y-5 ${modalTab === "basic" ? "block" : "hidden"}`}>
            {/* Image upload grid */}
            <div>
              <label className={lbl}>
                Destination Photos & Videos <span className="normal-case font-normal text-rose-400">*</span>
                <span className="normal-case font-normal text-stone-400 ml-1">(up to 10 — first is the hero)</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <ImageSlot key={i} index={i} url={images[i] ?? ""} uploading={uploadingSlot === i} onPick={handleImagePick} onRemove={handleImageRemove} />
                ))}
              </div>
              <p className="text-xs text-stone-400 mt-2">Click any empty slot to upload · Hover an image to replace or remove it</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className={lbl}>Name *</label><input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Ladakh" className={inp}/></div>
              <div><label className={lbl}>Slug * {!slugLocked && <span className="normal-case font-normal text-indigo-400">(auto)</span>}</label><input type="text" value={slug} onChange={e=>{setSlug(e.target.value);setSlugLocked(true);}} placeholder="e.g. ladakh" className={inp}/></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className={lbl}>City *</label><input type="text" value={city} onChange={e=>setCity(e.target.value)} placeholder="e.g. Agra" className={inp}/></div>
              <div><label className={lbl}>State *</label><input type="text" value={state} onChange={e=>setState(e.target.value)} placeholder="e.g. Uttar Pradesh" className={inp}/></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className={lbl}>Country</label><input type="text" value={country} onChange={e=>setCountry(e.target.value)} placeholder="India" className={inp}/></div>
              <div><label className={lbl}>Region *</label><input type="text" value={region} onChange={e=>setRegion(e.target.value)} placeholder="North India" className={inp}/></div>
            </div>

            <div><label className={lbl}>Tagline *</label><input type="text" value={tagline} onChange={e=>setTagline(e.target.value)} placeholder="One-liner that captures the destination" className={inp}/></div>

            <div className="grid grid-cols-3 gap-4">
              <div><label className={lbl}>Rating (0–5)</label><input type="number" min={0} max={5} step={0.1} value={rating} onChange={e=>setRating(+e.target.value)} className={inp}/></div>
              <div><label className={lbl}>Review Count</label><input type="number" min={0} value={reviewCount} onChange={e=>setRevCount(+e.target.value)} className={inp}/></div>
              <div><label className={lbl}>Climate</label><input type="text" value={climate} onChange={e=>setClimate(e.target.value)} placeholder="Tropical, Alpine…" className={inp}/></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className={lbl}>Latitude</label><input type="number" step="0.0001" value={latitude} onChange={e=>setLatitude(e.target.value)} placeholder="19.0760" className={inp}/></div>
              <div><label className={lbl}>Longitude</label><input type="number" step="0.0001" value={longitude} onChange={e=>setLongitude(e.target.value)} placeholder="72.8777" className={inp}/></div>
            </div>

            <div><label className={lbl}>Tags <span className="normal-case font-normal text-stone-400">(comma-separated)</span></label><input type="text" value={tagsStr} onChange={e=>setTagsStr(e.target.value)} placeholder="Mountains, Trekking, Snow" className={inp}/></div>
            <div><label className={lbl}>About</label><textarea value={about} onChange={e=>setAbout(e.target.value)} rows={3} placeholder="Short description of the destination…" className={inp+" resize-none"}/></div>

            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-stone-50">
              <div><p className="text-sm font-semibold text-stone-700">Published</p><p className="text-xs text-stone-400">Visible to all users on the platform</p></div>
              <button type="button" onClick={()=>setPublished(v=>!v)} className={`relative w-11 h-6 rounded-full transition-colors ${published?"bg-indigo-600":"bg-stone-200"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${published?"translate-x-5":"translate-x-0"}`}/>
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl">
                <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p className="text-sm text-rose-600 font-medium">{error}</p>
              </div>
            )}
          </div>

          {/* Activities Section */}
          <div className={`space-y-4 ${modalTab === "activities" ? "block" : "hidden"}`}>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-stone-900 uppercase tracking-wide">Activities</label>
              <button type="button" onClick={addActivity} className="text-xs font-bold bg-stone-100 hover:bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg transition-colors">+ Add Activity</button>
            </div>
            {activities.length === 0 && <p className="text-xs text-stone-400 italic">No activities added yet.</p>}
            {activities.map((act, i) => (
              <div key={i} className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 relative">
                <button type="button" onClick={() => setActivities(a => a.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-stone-400 hover:text-red-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                <div className="grid grid-cols-[100px_1fr] gap-4">
                  <div><ImageSlot index={i} url={act.image} uploading={uploadingActSlot === i} onPick={handleActivityImagePick} onRemove={() => setActivities(a => { const n = [...a]; n[i].image = ""; return n; })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><input type="text" placeholder="Title *" value={act.title} onChange={e => setActivities(a => { const n = [...a]; n[i].title = e.target.value; return n; })} className={inp + " py-2"}/></div>
                    <div><input type="text" placeholder="Category *" value={act.category} onChange={e => setActivities(a => { const n = [...a]; n[i].category = e.target.value; return n; })} className={inp + " py-2"}/></div>
                    <div><input type="text" placeholder="Duration *" value={act.duration} onChange={e => setActivities(a => { const n = [...a]; n[i].duration = e.target.value; return n; })} className={inp + " py-2"}/></div>
                    <div><input type="text" placeholder="Price *" value={act.price} onChange={e => setActivities(a => { const n = [...a]; n[i].price = e.target.value; return n; })} className={inp + " py-2"}/></div>
                    <div><input type="text" placeholder="Badge (Optional)" value={act.badge || ""} onChange={e => setActivities(a => { const n = [...a]; n[i].badge = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Hotels Section */}
          <div className={`space-y-4 ${modalTab === "hotels" ? "block" : "hidden"}`}>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-stone-900 uppercase tracking-wide">Hotels</label>
              <button type="button" onClick={addHotel} className="text-xs font-bold bg-stone-100 hover:bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg transition-colors">+ Add Hotel</button>
            </div>
            {hotels.length === 0 && <p className="text-xs text-stone-400 italic">No hotels added yet.</p>}
            {hotels.map((h, i) => (
              <div key={i} className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 relative">
                <button type="button" onClick={() => setHotels(a => a.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-stone-400 hover:text-red-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                <div className="grid grid-cols-[100px_1fr] gap-4">
                  <div><ImageSlot index={i} url={h.image} uploading={uploadingHotelSlot === i} onPick={handleHotelImagePick} onRemove={() => setHotels(a => { const n = [...a]; n[i].image = ""; return n; })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><input type="text" placeholder="Name *" value={h.name} onChange={e => setHotels(a => { const n = [...a]; n[i].name = e.target.value; return n; })} className={inp + " py-2"}/></div>
                    <div><input type="number" min={1} max={5} placeholder="Stars *" value={h.stars} onChange={e => setHotels(a => { const n = [...a]; n[i].stars = +e.target.value; return n; })} className={inp + " py-2"}/></div>
                    <div><input type="text" placeholder="Price *" value={h.price} onChange={e => setHotels(a => { const n = [...a]; n[i].price = e.target.value; return n; })} className={inp + " py-2"}/></div>
                    <div><input type="text" placeholder="Per Night *" value={h.perNight} onChange={e => setHotels(a => { const n = [...a]; n[i].perNight = e.target.value; return n; })} className={inp + " py-2"}/></div>
                    <div><input type="text" placeholder="Tag (Optional)" value={h.tag || ""} onChange={e => setHotels(a => { const n = [...a]; n[i].tag = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Transport Section */}
          <div className={`space-y-4 ${modalTab === "transport" ? "block" : "hidden"}`}>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-stone-900 uppercase tracking-wide">Transport Plans</label>
              <button type="button" onClick={addTransport} className="text-xs font-bold bg-stone-100 hover:bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg transition-colors">+ Add Transport</button>
            </div>
            {transports.length === 0 && <p className="text-xs text-stone-400 italic">No transport plans added yet.</p>}
            {transports.map((plan, i) => (
              <div key={i} className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 relative">
                <button type="button" onClick={() => setTransports(a => a.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-stone-400 hover:text-red-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                <div className="grid grid-cols-2 gap-3 pr-8">
                  <div>
                    <select value={plan.tier} onChange={e => setTransports(a => { const n = [...a]; n[i].tier = e.target.value; return n; })} className={inp + " py-2"}>
                      <option value="VVIP">VVIP</option>
                      <option value="VIP">VIP</option>
                      <option value="Normal">Normal</option>
                    </select>
                  </div>
                  <div><input type="text" placeholder="Plan title *" value={plan.title} onChange={e => setTransports(a => { const n = [...a]; n[i].title = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div className="col-span-2"><input type="text" placeholder="Vehicles e.g. BMW, Mercedes, Fortuner, bus, taxi, bike *" value={plan.vehicles} onChange={e => setTransports(a => { const n = [...a]; n[i].vehicles = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div><input type="text" placeholder="Price e.g. ₹12,000 *" value={plan.price} onChange={e => setTransports(a => { const n = [...a]; n[i].price = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div><input type="text" placeholder="Image URL optional" value={plan.image || ""} onChange={e => setTransports(a => { const n = [...a]; n[i].image = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div className="col-span-2"><textarea placeholder="Description *" value={plan.description} onChange={e => setTransports(a => { const n = [...a]; n[i].description = e.target.value; return n; })} rows={2} className={inp + " py-2 resize-none"}/></div>
                </div>
              </div>
            ))}
          </div>

          {/* Meals Section */}
          <div className={`space-y-4 ${modalTab === "meals" ? "block" : "hidden"}`}>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-stone-900 uppercase tracking-wide">Meal Plans</label>
              <button type="button" onClick={addMeal} className="text-xs font-bold bg-stone-100 hover:bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg transition-colors">+ Add Meal</button>
            </div>
            {meals.length === 0 && <p className="text-xs text-stone-400 italic">No meal plans added yet.</p>}
            {meals.map((plan, i) => (
              <div key={i} className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 relative">
                <button type="button" onClick={() => setMeals(a => a.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-stone-400 hover:text-red-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                <div className="grid grid-cols-2 gap-3 pr-8">
                  <div>
                    <select value={plan.tier} onChange={e => setMeals(a => { const n = [...a]; n[i].tier = e.target.value; return n; })} className={inp + " py-2"}>
                      <option value="VVIP">VVIP</option>
                      <option value="VIP">VIP</option>
                      <option value="Normal">Normal</option>
                    </select>
                  </div>
                  <div><input type="text" placeholder="Plan title *" value={plan.title} onChange={e => setMeals(a => { const n = [...a]; n[i].title = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div className="col-span-2"><input type="text" placeholder="Includes e.g. fine dining, breakfast, local meals *" value={plan.includes} onChange={e => setMeals(a => { const n = [...a]; n[i].includes = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div><input type="text" placeholder="Price e.g. ₹4,500 *" value={plan.price} onChange={e => setMeals(a => { const n = [...a]; n[i].price = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div><input type="text" placeholder="Image URL optional" value={plan.image || ""} onChange={e => setMeals(a => { const n = [...a]; n[i].image = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div className="col-span-2"><textarea placeholder="Description *" value={plan.description} onChange={e => setMeals(a => { const n = [...a]; n[i].description = e.target.value; return n; })} rows={2} className={inp + " py-2 resize-none"}/></div>
                </div>
              </div>
            ))}
          </div>

          {/* Flights Section */}
          <div className={`space-y-4 ${modalTab === "flights" ? "block" : "hidden"}`}>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-stone-900 uppercase tracking-wide">Flights</label>
              <button type="button" onClick={addFlight} className="text-xs font-bold bg-stone-100 hover:bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg transition-colors">+ Add Flight</button>
            </div>
            {flights.length === 0 && <p className="text-xs text-stone-400 italic">No flights added yet.</p>}
            {flights.map((f, i) => (
              <div key={i} className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 relative">
                <button type="button" onClick={() => setFlights(a => a.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-stone-400 hover:text-red-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                <div className="grid grid-cols-2 gap-3 pr-8">
                  <div><input type="text" placeholder="From *" value={f.from} onChange={e => setFlights(a => { const n = [...a]; n[i].from = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div><input type="text" placeholder="Code *" value={f.code} onChange={e => setFlights(a => { const n = [...a]; n[i].code = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div><input type="text" placeholder="Flag emoji *" value={f.flag} onChange={e => setFlights(a => { const n = [...a]; n[i].flag = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div><input type="text" placeholder="Airline *" value={f.airline} onChange={e => setFlights(a => { const n = [...a]; n[i].airline = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div><input type="text" placeholder="Duration *" value={f.duration} onChange={e => setFlights(a => { const n = [...a]; n[i].duration = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div><input type="text" placeholder="Frequency *" value={f.frequency} onChange={e => setFlights(a => { const n = [...a]; n[i].frequency = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div><input type="text" placeholder="Price *" value={f.price} onChange={e => setFlights(a => { const n = [...a]; n[i].price = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div className="flex items-center gap-2 px-2">
                    <input type="checkbox" checked={f.direct} onChange={e => setFlights(a => { const n = [...a]; n[i].direct = e.target.checked; return n; })} id={`f-direct-${i}`}/>
                    <label htmlFor={`f-direct-${i}`} className="text-sm text-stone-700">Direct flight</label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trains Section */}
          <div className={`space-y-4 ${modalTab === "trains" ? "block" : "hidden"}`}>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-stone-900 uppercase tracking-wide">Trains</label>
              <button type="button" onClick={addTrain} className="text-xs font-bold bg-stone-100 hover:bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg transition-colors">+ Add Train</button>
            </div>
            {trains.length === 0 && <p className="text-xs text-stone-400 italic">No trains added yet.</p>}
            {trains.map((t, i) => (
              <div key={i} className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 relative">
                <button type="button" onClick={() => setTrains(a => a.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-stone-400 hover:text-red-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                <div className="grid grid-cols-2 gap-3 pr-8">
                  <div><input type="text" placeholder="From *" value={t.from} onChange={e => setTrains(a => { const n = [...a]; n[i].from = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div><input type="text" placeholder="Type *" value={t.type} onChange={e => setTrains(a => { const n = [...a]; n[i].type = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div><input type="text" placeholder="Duration *" value={t.duration} onChange={e => setTrains(a => { const n = [...a]; n[i].duration = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div><input type="text" placeholder="Operator *" value={t.operator} onChange={e => setTrains(a => { const n = [...a]; n[i].operator = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div><input type="text" placeholder="Price *" value={t.price} onChange={e => setTrains(a => { const n = [...a]; n[i].price = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div><input type="text" placeholder="Icon *" value={t.icon} onChange={e => setTrains(a => { const n = [...a]; n[i].icon = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div className="col-span-2"><input type="text" placeholder="Note (Optional)" value={t.note || ""} onChange={e => setTrains(a => { const n = [...a]; n[i].note = e.target.value; return n; })} className={inp + " py-2"}/></div>
                </div>
              </div>
            ))}
          </div>

          {/* Transfers Section */}
          <div className={`space-y-4 ${modalTab === "transfers" ? "block" : "hidden"}`}>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-stone-900 uppercase tracking-wide">Transfers</label>
              <button type="button" onClick={addTransfer} className="text-xs font-bold bg-stone-100 hover:bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg transition-colors">+ Add Transfer</button>
            </div>
            {transfers.length === 0 && <p className="text-xs text-stone-400 italic">No transfers added yet.</p>}
            {transfers.map((t, i) => (
              <div key={i} className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 relative">
                <button type="button" onClick={() => setTransfers(a => a.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-stone-400 hover:text-red-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                <div className="grid grid-cols-2 gap-3 pr-8">
                  <div><input type="text" placeholder="Type (e.g., Private Taxi) *" value={t.type} onChange={e => setTransfers(a => { const n = [...a]; n[i].type = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div><input type="text" placeholder="Duration *" value={t.duration} onChange={e => setTransfers(a => { const n = [...a]; n[i].duration = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div><input type="text" placeholder="Price *" value={t.price} onChange={e => setTransfers(a => { const n = [...a]; n[i].price = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div><input type="text" placeholder="Icon Emoji *" value={t.icon} onChange={e => setTransfers(a => { const n = [...a]; n[i].icon = e.target.value; return n; })} className={inp + " py-2"}/></div>
                  <div className="col-span-2"><textarea placeholder="Description *" value={t.desc} onChange={e => setTransfers(a => { const n = [...a]; n[i].desc = e.target.value; return n; })} rows={2} className={inp + " py-2 resize-none"}/></div>
                  <div className="col-span-2 flex items-center gap-2 px-2">
                    <input type="checkbox" checked={t.recommended} onChange={e => setTransfers(a => { const n = [...a]; n[i].recommended = e.target.checked; return n; })} id={`t-rec-${i}`}/>
                    <label htmlFor={`t-rec-${i}`} className="text-sm text-stone-700 font-medium">Recommended Option</label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sticky footer with save button */}
        <div className="px-7 py-5 border-t border-stone-100 bg-stone-50/80 rounded-b-3xl flex-shrink-0 flex gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl border border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploadingSlot !== null || uploadingActSlot !== null || uploadingHotelSlot !== null}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm shadow-indigo-200"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Saving…
              </>
            ) : uploadingSlot !== null || uploadingActSlot !== null || uploadingHotelSlot !== null ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Uploading image…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                {initial ? "Save Changes" : "Add Destination"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Notification Center ────────────────────────────────────────────────────
type AdminNotification = {
  id: string;
  type: "user" | "review" | "inquiry" | "transport" | "wishlist";
  title: string;
  message: string;
  createdAt: Date;
  isNew: boolean;
};

function NotificationCenter({ users, reviews, inquiries, transportData }: { users: AdminUser[], reviews: AdminReview[], inquiries: AdminInquiry[], transportData: TransportAdminData | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [lastRead, setLastRead] = useState<number>(() => parseInt(localStorage.getItem('admin_notifications_last_read') || '0', 10));
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const notifications = useMemo(() => {
    const notifs: AdminNotification[] = [];
    users.forEach(u => notifs.push({ id: `user-${u.id}`, type: "user", title: "New User", message: `${u.name} registered a new account.`, createdAt: new Date(u.createdAt), isNew: false }));
    reviews.forEach(r => notifs.push({ id: `review-${r.id}`, type: "review", title: "New Review", message: `New review received for ${r.destId}.`, createdAt: new Date(r.createdAt), isNew: false }));
    inquiries.forEach(i => notifs.push({ id: `inq-${i.id}`, type: "inquiry", title: "New Inquiry", message: `New inquiry received from ${i.name}.`, createdAt: new Date(i.createdAt), isNew: false }));
    transportData?.bookings?.forEach(b => notifs.push({ id: `book-${b.id}`, type: "transport", title: "New Transport Request", message: `Pickup request submitted for ${b.pickupLocation.label}.`, createdAt: new Date(b.createdAt), isNew: false }));
    
    notifs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    notifs.forEach(n => n.isNew = n.createdAt.getTime() > lastRead);
    return notifs.slice(0, 50);
  }, [users, reviews, inquiries, transportData, lastRead]);

  const unreadCount = notifications.filter(n => n.isNew).length;

  const handleOpen = () => {
    if (!isOpen) {
      const now = Date.now();
      setLastRead(now);
      localStorage.setItem('admin_notifications_last_read', now.toString());
      notifications.forEach(n => n.isNew = false);
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={handleOpen} className="relative p-2 text-stone-500 hover:text-indigo-600 transition-colors rounded-full hover:bg-indigo-50">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-100 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
            <span className="font-bold text-stone-900 text-sm">Notifications</span>
            {unreadCount > 0 && <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">{unreadCount} New</span>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-stone-400">No notifications yet.</div>
            ) : (
              <div className="divide-y divide-stone-50">
                {notifications.map(n => (
                  <div key={n.id} className={`p-4 hover:bg-stone-50 transition-colors ${n.isNew ? 'bg-indigo-50/30' : ''}`}>
                    <div className="flex gap-3">
                      <div className="text-xl">
                        {n.type === 'user' ? '👤' : n.type === 'review' ? '⭐' : n.type === 'inquiry' ? '💬' : '🚌'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${n.isNew ? 'text-indigo-900' : 'text-stone-900'}`}>{n.message}</p>
                        <p className="text-xs text-stone-400 mt-1">{fmtDate(n.createdAt)}</p>
                      </div>
                      {n.isNew && <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────
function OverviewTab({ 
  stats, users, reviews, dests, inquiries, transportData 
}: { 
  stats: AdminStats | null; 
  users: AdminUser[]; 
  reviews: AdminReview[]; 
  dests: CustomDest[];
  inquiries: AdminInquiry[];
  transportData: TransportAdminData | null;
}) {
  if (!stats) return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-pulse">
      {[1,2,3,4,5].map(i => <div key={i} className="bg-white rounded-2xl border border-stone-100 h-24"/>)}
    </div>
  );

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfToday - (now.getDay() * 24 * 60 * 60 * 1000);

  const newUsersToday = users.filter(u => new Date(u.createdAt).getTime() >= startOfToday).length;
  const newUsersWeek = users.filter(u => new Date(u.createdAt).getTime() >= startOfWeek).length;
  const newReviewsToday = reviews.filter(r => new Date(r.createdAt).getTime() >= startOfToday).length;
  const newInquiries = inquiries.filter(i => !i.status || i.status === "Pending").length;
  
  const totalTransport = transportData?.bookings?.length || 0;
  const pendingDrivers = transportData?.bookings?.filter(b => b.status === "Pending" || !b.driverAssigned).length || 0;
  const completedTransport = transportData?.bookings?.filter(b => b.status === "Completed").length || 0;

  const activities = [
    ...users.map(u => ({ id: `act-u-${u.id}`, type: "signup", text: `${u.name} registered`, time: new Date(u.createdAt) })),
    ...reviews.map(r => ({ id: `act-r-${r.id}`, type: "review", text: `Review on ${r.destId} by ${r.authorName}`, time: new Date(r.createdAt) })),
    ...inquiries.map(i => ({ id: `act-i-${i.id}`, type: "inquiry", text: `Inquiry from ${i.name}`, time: new Date(i.createdAt) })),
    ...(transportData?.bookings || []).map(b => ({ id: `act-b-${b.id}`, type: "transport", text: `Pickup from ${b.pickupLocation.label}`, time: new Date(b.createdAt) }))
  ].sort((a,b) => b.time.getTime() - a.time.getTime()).slice(0, 5);

  const getRelativeTime = (date: Date) => {
    const diffInMins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffInMins < 1) return "Just now";
    if (diffInMins < 60) return `${diffInMins} mins ago`;
    const diffInHours = Math.floor(diffInMins / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return fmtDate(date.toISOString());
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10 flex-1">
          <h2 className="text-2xl font-black mb-2 flex items-center gap-2">Live Operations Dashboard 🟢</h2>
          <p className="text-white/80 text-sm font-medium max-w-lg">
            Real-time monitoring of all platform activity, user engagements, and operational metrics.
          </p>
        </div>
        
        {/* Live Activity Feed */}
        <div className="relative z-10 w-full md:w-96 bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/10">
          <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Live Feed</p>
          <div className="space-y-2.5">
            {activities.length === 0 ? <p className="text-xs text-white/50">No recent activity</p> : 
              activities.slice(0, 3).map(act => (
                <div key={act.id} className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{act.type === 'signup' ? '👤' : act.type === 'review' ? '⭐' : act.type === 'inquiry' ? '💬' : '🚌'}</span>
                    <span className="text-xs font-medium text-white/90 truncate max-w-[180px]">{act.text}</span>
                  </div>
                  <span className="text-[10px] text-white/50 whitespace-nowrap">{getRelativeTime(act.time)}</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="👤" label="Total Users" value={stats.users} badge={newUsersToday > 0 ? `+${newUsersToday} Today` : undefined} badgeColor="bg-emerald-100 text-emerald-700" bg="bg-white"/>
        <StatCard icon="📈" label="New Signups" value={newUsersWeek} bg="bg-white"/>
        <StatCard icon="⭐" label="Total Reviews" value={stats.reviews} badge={newReviewsToday > 0 ? `+${newReviewsToday} Today` : undefined} badgeColor="bg-emerald-100 text-emerald-700" bg="bg-white"/>
        <StatCard icon="🗺️" label="Live Destinations" value={stats.liveDestinations ?? stats.destinations} bg="bg-white"/>
        
        <StatCard icon="💬" label="Total Inquiries" value={inquiries.length} badge={newInquiries > 0 ? `${newInquiries} New` : undefined} badgeColor="bg-rose-100 text-rose-700" bg="bg-white"/>
        <StatCard icon="🚖" label="Transport Requests" value={totalTransport} bg="bg-white"/>
        <StatCard icon="⏳" label="Pending Drivers" value={pendingDrivers} badge={pendingDrivers > 0 ? `Urgent` : undefined} badgeColor="bg-amber-100 text-amber-700" bg="bg-white"/>
        <StatCard icon="✅" label="Completed Rides" value={completedTransport} bg="bg-white"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden flex flex-col h-96">
          <div className="px-5 py-4 border-b border-stone-50 flex justify-between items-center bg-stone-50/50">
            <p className="font-bold text-stone-900 text-sm">Recent Users</p>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">Latest 50</span>
          </div>
          <div className="divide-y divide-stone-50 overflow-y-auto flex-1">
            {users.slice(0, 50).map(u => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50 transition-colors">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getGradient(u.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{getInitials(u.name)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-900 truncate">{u.name}</p>
                  <p className="text-xs text-stone-400 truncate">{u.email}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mb-1">Active</p>
                  <p className="text-xs text-stone-400 block">{getRelativeTime(new Date(u.createdAt))}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden flex flex-col h-96">
          <div className="px-5 py-4 border-b border-stone-50 flex justify-between items-center bg-stone-50/50">
            <p className="font-bold text-stone-900 text-sm">Recent Transport Requests</p>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">Latest</span>
          </div>
          <div className="divide-y divide-stone-50 overflow-y-auto flex-1">
            {(transportData?.bookings || []).slice(0, 10).map(b => (
              <div key={b.id} className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 text-sm flex-shrink-0">🚖</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-900 truncate">{b.userName} <span className="text-stone-400 font-normal">→ {b.pickupLocation.destinationName}</span></p>
                  <p className="text-xs text-stone-500 truncate mt-0.5">Pickup: {b.pickupLocation.label}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md inline-block mb-1 ${b.status === "Pending" ? "bg-amber-100 text-amber-700" : b.status === "Completed" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>
                    {b.status || "Pending"}
                  </span>
                  <p className="text-[10px] text-stone-400 block">{getRelativeTime(new Date(b.createdAt))}</p>
                </div>
              </div>
            ))}
            {(!transportData?.bookings || transportData.bookings.length === 0) && <p className="p-8 text-center text-sm text-stone-400">No requests yet.</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden flex flex-col h-96">
          <div className="px-5 py-4 border-b border-stone-50 flex justify-between items-center bg-stone-50/50">
            <p className="font-bold text-stone-900 text-sm">Recent Inquiries</p>
          </div>
          <div className="divide-y divide-stone-50 overflow-y-auto flex-1">
            {inquiries.slice(0, 10).map(i => (
              <div key={i.id} className="flex items-start gap-3 px-5 py-3 hover:bg-stone-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 text-sm flex-shrink-0">💬</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-semibold text-stone-900 truncate pr-2">{i.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${(!i.status || i.status === "Pending") ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {i.status || "Pending"}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-stone-600 truncate mb-1">{i.subject}</p>
                  <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">{i.message}</p>
                  <p className="text-[10px] text-stone-400 mt-2">{getRelativeTime(new Date(i.createdAt))}</p>
                </div>
              </div>
            ))}
            {inquiries.length === 0 && <p className="p-8 text-center text-sm text-stone-400">No inquiries yet.</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden flex flex-col h-96">
          <div className="px-5 py-4 border-b border-stone-50 flex justify-between items-center bg-stone-50/50">
            <p className="font-bold text-stone-900 text-sm">Recent Reviews</p>
          </div>
          <div className="divide-y divide-stone-50 overflow-y-auto flex-1">
            {reviews.slice(0, 10).map(r => {
              const dest = dests.find(d => d.id === r.destId);
              return (
                <div key={r.id} className="flex items-start gap-3 px-5 py-4 hover:bg-stone-50 transition-colors">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getGradient(r.authorName)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{getInitials(r.authorName)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-semibold text-stone-900 truncate pr-2">{r.authorName}</p>
                      <StarRow rating={r.rating}/>
                    </div>
                    <p className="text-[11px] font-bold text-indigo-600 mb-1 flex items-center gap-1">📍 {dest?.name ?? r.destId}</p>
                    <p className="text-xs font-medium text-stone-800 mb-1 truncate">{r.title}</p>
                    <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">{r.content}</p>
                    <p className="text-[10px] text-stone-400 mt-2">{getRelativeTime(new Date(r.createdAt))}</p>
                  </div>
                </div>
              );
            })}
            {reviews.length === 0 && <p className="p-8 text-center text-sm text-stone-400">No reviews yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Users Tab ──────────────────────────────────────────────────────────────
function UsersTab({ users, onDelete }: { users: AdminUser[]; onDelete: (id: string) => void }) {
  const [search, setSearch]         = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  const validUsers = users.filter(u => {
    const email = u.email.toLowerCase();
    return !email.includes("stripe-test") && !email.includes("qa+") && !email.includes("demo") && !email.includes("test");
  });

  const filtered = validUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email…" className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"/>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">User</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide text-center">Reviews</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide text-center">Wishlist</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Joined</th>
                <th className="px-4 py-3"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getGradient(u.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{getInitials(u.name)}</div>
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-900 truncate">{u.name}</p>
                        <p className="text-xs text-stone-400 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center font-semibold text-stone-700">{u.reviewCount}</td>
                  <td className="px-4 py-3.5 text-center font-semibold text-stone-700">{u.wishlistCount}</td>
                  <td className="px-4 py-3.5 text-xs text-stone-400">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3.5 text-right">
                    {confirming === u.id
                      ? <span className="inline-flex items-center gap-1.5">
                          <button onClick={()=>{onDelete(u.id);setConfirming(null);}} className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg transition-colors">Delete</button>
                          <button onClick={()=>setConfirming(null)} className="text-xs text-stone-500 px-2.5 py-1 rounded-lg border border-stone-200 transition-colors">Cancel</button>
                        </span>
                      : <button onClick={()=>setConfirming(u.id)} className="text-xs text-stone-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">Delete</button>
                    }
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-stone-400">No users found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Reviews Tab ────────────────────────────────────────────────────────────
function ReviewsTab({ reviews, dests, onDelete }: { reviews: AdminReview[]; dests: CustomDest[]; onDelete: (id: string) => void }) {
  const [filter,     setFilter]     = useState("all");
  const [confirming, setConfirming] = useState<string | null>(null);
  const filtered = filter === "all" ? reviews : reviews.filter(r => r.destId === filter);

  return (
    <div className="space-y-4">
      <select value={filter} onChange={e=>setFilter(e.target.value)} className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
        <option value="all">All Destinations</option>
        {dests.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Destination</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Author</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Rating</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Title</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filtered.map(r => {
                const dest = dests.find(d => d.id === r.destId);
                return (
                  <tr key={r.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-stone-900">{dest?.name ?? r.destId}</td>
                    <td className="px-4 py-3.5 text-stone-600 whitespace-nowrap">{r.authorName}</td>
                    <td className="px-4 py-3.5"><StarRow rating={r.rating}/></td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-stone-900">{r.title}</p>
                      <p className="text-sm text-stone-500 mt-1">{r.review}</p>
                      {r.photos && r.photos.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {r.photos.map((photo, i) => (
                            <img key={i} src={photo} alt="" className="w-12 h-12 rounded object-cover border border-stone-200" />
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-stone-400 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                    <td className="px-4 py-3.5 text-right">
                      {confirming === r.id
                        ? <span className="inline-flex items-center gap-1.5">
                            <button onClick={()=>{onDelete(r.id);setConfirming(null);}} className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg transition-colors">Delete</button>
                            <button onClick={()=>setConfirming(null)} className="text-xs text-stone-500 px-2.5 py-1 rounded-lg border border-stone-200 transition-colors">Cancel</button>
                          </span>
                        : <button onClick={()=>setConfirming(r.id)} className="text-xs text-stone-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">Delete</button>
                      }
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-stone-400">No reviews found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Inquiries Tab ────────────────────────────────────────────────────────
function InquiriesTab({ inquiries, setInquiries }: { inquiries: AdminInquiry[]; setInquiries: React.Dispatch<React.SetStateAction<AdminInquiry[]>> }) {
  const { toast } = useToast();
  const [replying, setReplying] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [replyMsg, setReplyMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete(id: string) {
    try {
      await apiFetch(`/v1/inquiries/${id}`, { method: "DELETE" });
      setInquiries(prev => prev.filter(i => i.id !== id));
      setDeleting(null);
      toast({ title: "Deleted", description: "Inquiry deleted successfully", variant: "default" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete", variant: "destructive" });
    }
  }

  async function handleReply(id: string) {
    if (!replyMsg.trim()) return;
    setSubmitting(true);
    try {
      const { inquiry } = await apiFetch<{ inquiry: AdminInquiry }>(`/v1/inquiries/${id}/reply`, {
        method: "PATCH",
        body: JSON.stringify({ replyMessage: replyMsg })
      });
      setInquiries(prev => prev.map(i => i.id === id ? inquiry : i));
      setReplying(null);
      setReplyMsg("");
    } catch (err: any) {
      alert(err.message || "Failed to reply");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {inquiries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-stone-200 py-16 text-center">
          <p className="text-sm font-semibold text-stone-700">No inquiries yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {inquiries.map(inq => (
            <div key={inq.id} className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-stone-900">{inq.name} <span className="text-sm font-normal text-stone-500 ml-2">({inq.email} • {inq.phone})</span></h4>
                  <p className="text-sm text-stone-600 mt-1"><strong>Destination:</strong> {inq.destination} | <strong>Dates:</strong> {inq.travelDates}</p>
                </div>
                {(!inq.status || inq.status === "Pending") ? (
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-600 text-xs font-semibold rounded-lg">Pending</span>
                ) : (
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-lg">Replied</span>
                )}
              </div>
              <div className="mt-4 p-3 bg-stone-50 rounded-xl text-sm text-stone-700 border border-stone-100">
                <p><strong>Message:</strong></p>
                <p className="mt-1 whitespace-pre-wrap">{inq.message}</p>
              </div>

              {inq.status === "Replied" && inq.replyMessage && (
                <div className="mt-4 p-3 bg-indigo-50 rounded-xl text-sm text-indigo-900 border border-indigo-100">
                  <div className="flex justify-between items-center mb-1">
                    <p><strong>Your Reply:</strong></p>
                    <div className="flex gap-2">
                      {inq.notificationEmailSent && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] uppercase font-bold rounded">Email Sent</span>}
                      {inq.notificationDelivered && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] uppercase font-bold rounded">Delivered</span>}
                      {inq.notificationRead && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] uppercase font-bold rounded">Read</span>}
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap">{inq.replyMessage}</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {(!inq.status || inq.status === "Pending") && (
                  replying === inq.id ? (
                    <div className="space-y-3 w-full mb-2">
                      <textarea
                        value={replyMsg}
                        onChange={e => setReplyMsg(e.target.value)}
                        placeholder="Write your reply here..."
                        className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        rows={3}
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setReplying(null)} className="px-3 py-1.5 text-xs font-semibold text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors">Cancel</button>
                        <button onClick={() => void handleReply(inq.id)} disabled={submitting} className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                          {submitting ? "Sending..." : "Send Reply"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setReplying(inq.id); setReplyMsg(""); }} className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">
                      Reply to Inquiry
                    </button>
                  )
                )}

                {deleting === inq.id ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => void handleDelete(inq.id)} className="px-3 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors">Confirm Delete</button>
                    <button onClick={() => setDeleting(null)} className="px-3 py-2 text-sm font-semibold text-stone-600 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleting(inq.id)} className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Destinations Tab ───────────────────────────────────────────────────────
function DestinationsTab({ dests, onAdd, onEdit, onDelete }: { dests: CustomDest[]; onAdd: () => void; onEdit: (d: CustomDest) => void; onDelete: (id: string) => void; }) {
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/* Custom */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-stone-900">Custom Destinations</h3>
            <span className="text-xs px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-medium">{dests.length} added</span>
          </div>
          <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            Add Destination
          </button>
        </div>

        {dests.length === 0
          ? <div className="bg-white rounded-2xl border border-dashed border-stone-200 py-16 text-center">
              <p className="text-3xl mb-3">📍</p>
              <p className="text-sm font-semibold text-stone-700">No custom destinations yet</p>
              <p className="text-xs text-stone-400 mt-1">Click "Add Destination" to create one</p>
            </div>
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {dests.map(d => (
                <div key={d.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                  <div className="relative h-28">
                    <img src={imageSrc(d.heroImage)} alt={d.name} className="w-full h-full object-cover" onError={e=>{(e.target as HTMLImageElement).src=FALLBACK_DEST_IMAGE;}}/>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                    <div className="absolute bottom-2 left-3 text-white">
                      <p className="font-bold text-sm">{d.name}</p>
                      <p className="text-white/70 text-[11px]">{d.state}</p>
                    </div>
                    {!d.isPublished && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-amber-400 text-white text-[10px] font-semibold">Draft</div>
                    )}
                  </div>
                  <div className="px-3 py-2 flex items-center gap-1.5 text-xs text-stone-500">
                    <svg className="w-3 h-3 fill-amber-400 flex-shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    <span className="truncate flex-1">{d.rating.toFixed(1)} · {d.region}</span>
                    <button onClick={()=>onEdit(d)} className="text-indigo-500 hover:text-indigo-700 font-medium px-1.5 py-0.5 rounded hover:bg-indigo-50 transition-colors flex-shrink-0">Edit</button>
                    {confirming===d.id
                      ? <span className="inline-flex items-center gap-1 flex-shrink-0">
                          <button onClick={()=>{onDelete(d.id);setConfirming(null);}} className="text-white bg-red-500 font-semibold px-1.5 py-0.5 rounded transition-colors">Yes</button>
                          <button onClick={()=>setConfirming(null)} className="text-stone-500 border border-stone-200 px-1.5 py-0.5 rounded transition-colors">No</button>
                        </span>
                      : <button onClick={()=>setConfirming(d.id)} className="text-stone-400 hover:text-red-500 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors flex-shrink-0">Del</button>
                    }
                  </div>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}

// ── Navigation items ───────────────────────────────────────────────────────
function ManagedDestinationsTab({ dests, onAdd, onEdit, onDelete }: { dests: CustomDest[]; onAdd: () => void; onEdit: (d: CustomDest) => void; onDelete: (id: string) => void; }) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const states = Array.from(new Set(dests.map(d => d.state).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const filtered = dests.filter(d => {
    const q = search.toLowerCase().trim();
    if (q && !(d.name.toLowerCase().includes(q) || (d.city ?? "").toLowerCase().includes(q) || d.state.toLowerCase().includes(q))) return false;
    if (stateFilter !== "all" && d.state !== stateFilter) return false;
    if (statusFilter === "published" && !d.isPublished) return false;
    if (statusFilter === "draft" && d.isPublished) return false;
    return true;
  });
  const pages = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [search, stateFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-stone-900">Destination Management</h2>
            <p className="text-sm text-stone-400 mt-0.5">Create unlimited city destinations under any state.</p>
          </div>
          <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            Add Destination
          </button>
        </div>

        <div className="grid md:grid-cols-[1fr_180px_160px] gap-3">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, city, or state" className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
          <select value={stateFilter} onChange={e=>setStateFilter(e.target.value)} className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="all">All states</option>
            {states.map(state => <option key={state} value={state}>{state}</option>)}
          </select>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as "all" | "published" | "draft")} className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="all">All status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="font-bold text-stone-900">Admin Destinations</div>
          <span className="text-xs px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-medium">{filtered.length} shown</span>
        </div>
        {visible.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-stone-700">No destinations found</p>
            <p className="text-xs text-stone-400 mt-1">Try another search or add a new destination.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-400">
                <tr>
                  <th className="text-left px-5 py-3">Destination</th>
                  <th className="text-left px-5 py-3">City</th>
                  <th className="text-left px-5 py-3">State</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visible.map(d => (
                  <tr key={d.id} className="hover:bg-stone-50/70">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 min-w-[240px]">
                        <img src={imageSrc(d.heroImage)} alt={d.name} loading="lazy" className="w-14 h-12 rounded-xl object-cover bg-stone-100" onError={e=>{(e.target as HTMLImageElement).src=FALLBACK_DEST_IMAGE;}}/>
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 truncate">{d.name}</p>
                          <p className="text-xs text-stone-400 truncate">/{d.stateSlug || toSlug(d.state)}/{d.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-stone-600">{d.city || d.name}</td>
                    <td className="px-5 py-3 text-stone-600">{d.state}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${d.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {d.isPublished ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button onClick={()=>onEdit(d)} className="text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 rounded hover:bg-indigo-50">Edit</button>
                      {confirming===d.id
                        ? <>
                            <button onClick={()=>{onDelete(d.id);setConfirming(null);}} className="text-white bg-red-500 font-semibold px-2 py-1 rounded ml-1">Yes</button>
                            <button onClick={()=>setConfirming(null)} className="text-stone-500 border border-stone-200 px-2 py-1 rounded ml-1">No</button>
                          </>
                        : <button onClick={()=>setConfirming(d.id)} className="text-stone-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50">Delete</button>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 py-3 border-t border-stone-100 flex items-center justify-between">
          <span className="text-xs text-stone-400">Page {page} of {pages}</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-600 disabled:opacity-40">Prev</button>
            <button disabled={page >= pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-600 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>


    </div>
  );
}

function ActivityList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-4">
      <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-3">{title}</p>
      <div className="space-y-2">
        {items.slice(0, 8).map((item, index) => (
          <p key={`${item}-${index}`} className="text-sm text-stone-700 bg-white rounded-lg px-3 py-2 border border-stone-100 truncate">{item}</p>
        ))}
        {items.length === 0 && <p className="text-sm text-stone-400">{empty}</p>}
      </div>
    </div>
  );
}

function ActivityTab({ activity }: { activity: AdminActivityResponse | null }) {
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const users = activity?.users ?? [];
  const timeline = selectedUserId === "all"
    ? activity?.timeline ?? []
    : (activity?.timeline ?? []).filter(item => item.userId === selectedUserId);
  const selectedUser = selectedUserId === "all" ? null : users.find(item => item.user.id === selectedUserId) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900">User Activity</h2>
          <p className="text-sm text-stone-400 mt-0.5">Track signups, wishlist saves, reviews, hotels, and activities.</p>
        </div>
        <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="all">All users</option>
          {users.map(item => <option key={item.user.id} value={item.user.id}>{item.user.name} · {item.user.email}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Users", value: users.length, icon: "👤" },
          { label: "Saved Destinations", value: users.reduce((sum, item) => sum + item.totals.destinations, 0), icon: "📍" },
          { label: "Saved Activities", value: users.reduce((sum, item) => sum + item.totals.activities, 0), icon: "🎟" },
          { label: "Saved Hotels", value: users.reduce((sum, item) => sum + item.totals.hotels, 0), icon: "🏨" },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
            <div className="text-xl">{item.icon}</div>
            <div className="text-2xl font-extrabold text-stone-900 mt-2">{item.value}</div>
            <div className="text-xs text-stone-400 font-medium mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {selectedUser && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getGradient(selectedUser.user.name)} text-white flex items-center justify-center text-sm font-bold`}>
              {getInitials(selectedUser.user.name)}
            </div>
            <div>
              <p className="font-bold text-stone-900">{selectedUser.user.name}</p>
              <p className="text-xs text-stone-400">{selectedUser.user.email} · joined {fmtDate(selectedUser.user.createdAt)}</p>
            </div>
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <ActivityList title="Saved Destinations" empty="No saved destinations" items={selectedUser.wishlist.destinations.map(item => `${item.name} · ${item.state}`)} />
            <ActivityList title="Saved Activities" empty="No saved activities" items={selectedUser.wishlist.activities.map(item => `${item.title} · ${item.destName}`)} />
            <ActivityList title="Saved Hotels" empty="No saved hotels" items={selectedUser.wishlist.hotels.map(item => `${item.name} · ${item.destName}`)} />
          </div>
          <div className="mt-4">
            <ActivityList title="Reviews" empty="No reviews yet" items={selectedUser.reviews.map(item => `${item.rating}/5 · ${item.title} · ${item.destId}`)} />
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-50 flex items-center justify-between">
          <p className="font-bold text-stone-900 text-sm">Timeline</p>
          <span className="text-xs text-stone-400">{timeline.length} events</span>
        </div>
        <div className="divide-y divide-stone-50">
          {timeline.map(item => (
            <div key={item.id} className="px-5 py-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {item.label.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-stone-800">{item.userName} · {item.label}</p>
                <p className="text-xs text-stone-400 truncate">{item.detail}</p>
              </div>
              <span className="text-xs text-stone-400 whitespace-nowrap">{fmtDate(item.createdAt)}</span>
            </div>
          ))}
          {timeline.length === 0 && <p className="px-5 py-10 text-sm text-stone-400 text-center">No activity yet.</p>}
        </div>
      </div>
    </div>
  );
}

// ── BookingRow ─────────────────────────────────────────────────────────────
function BookingRow({ item, updateBooking, deleteBooking }: { item: TransportBooking; updateBooking: (id: string, patch: Partial<TransportBooking>) => void; deleteBooking: (id: string) => void }) {
  const [status, setStatus] = useState(item.status || "Pending");
  const [assignedDriver, setAssignedDriver] = useState(item.assignedDriver || "");
  const [assignedStaff, setAssignedStaff] = useState(item.assignedStaff || "");
  const [assignmentConfirmed, setAssignmentConfirmed] = useState(!!item.assignmentConfirmed);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (isDeleting) return null;

  return (
    <tr>
      <td className="p-3"><b>{item.travelerName}</b><p className="text-xs text-stone-400">{item.phone} · {item.email}</p></td>
      <td><b>{item.destinationName}</b><p className="text-xs text-stone-400">{item.checkInDate} to {item.checkOutDate} · {item.travelers} pax</p></td>
      <td><b>{item.pickupLocation?.label}</b><p className="text-xs text-stone-400">{item.pickupLocation?.address}</p></td>
      <td><b>{item.travelMode} {item.vehicle?.name}</b><p className="text-xs text-stone-400">{item.bookingReference}</p></td>
      <td className="font-black text-indigo-600">₹{item.totalAmount.toLocaleString("en-IN")}</td>
      <td>
        <select 
          value={status} 
          onChange={e => {
            const val = e.target.value as any;
            setStatus(val);
            updateBooking(item.id, { status: val });
          }} 
          className="rounded-xl border border-stone-200 px-2 py-1 text-xs font-bold"
        >
          <option>Pending</option><option>Assigned</option><option>Picked Up</option><option>In Progress</option><option>Completed</option>
        </select>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <input 
            value={assignedDriver} 
            onChange={e => setAssignedDriver(e.target.value)}
            onBlur={() => updateBooking(item.id, { assignedDriver })} 
            placeholder="Driver" 
            className="w-28 rounded-xl border border-stone-200 px-2 py-1 text-xs" 
          />
          <input 
            value={assignedStaff} 
            onChange={e => setAssignedStaff(e.target.value)}
            onBlur={() => updateBooking(item.id, { assignedStaff })} 
            placeholder="Staff" 
            className="w-28 rounded-xl border border-stone-200 px-2 py-1 text-xs" 
          />
          <button
            onClick={() => {
              if (assignmentConfirmed) return;
              setAssignmentConfirmed(true);
              updateBooking(item.id, { assignmentConfirmed: true });
            }}
            disabled={(!assignedDriver && !assignedStaff) && !assignmentConfirmed}
            title={assignmentConfirmed ? "Assignment confirmed" : "Confirm assigned driver or staff"}
            className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-black transition-colors ${
              assignmentConfirmed
                ? "border-emerald-200 bg-emerald-500 text-white cursor-default"
                : "border-stone-200 bg-white text-stone-400 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
            }`}
          >
            ✓
          </button>
        </div>
        {assignmentConfirmed && <p className="mt-1 text-[10px] font-bold text-emerald-600">Confirmed</p>}
      </td>
      <td>
        {confirmingDelete ? (
          <span className="inline-flex items-center gap-1.5">
            <button onClick={() => { setIsDeleting(true); deleteBooking(item.id); }} className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg transition-colors">Confirm</button>
            <button onClick={() => setConfirmingDelete(false)} className="text-xs text-stone-500 px-2.5 py-1 rounded-lg border border-stone-200 transition-colors">Cancel</button>
          </span>
        ) : (
          <button onClick={() => setConfirmingDelete(true)} className="text-xs text-stone-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">Delete</button>
        )}
      </td>
    </tr>
  );
}

// ── TransportTab ───────────────────────────────────────────────────────────
function TransportTab({ data, dests, refresh }: { data: TransportAdminData | null; dests: CustomDest[]; refresh: () => void }) {
  const { toast } = useToast();
  const [category, setCategory] = useState({ name: "", mode: "Normal" as const, description: "" });
  const [vehicle, setVehicle] = useState({ categoryId: "", mode: "Normal" as const, name: "", type: "", price: 0, capacity: 4, image: "", description: "" });
  const [pickup, setPickup] = useState({ destinationSlug: "", destinationName: "", label: "", type: "Airport", address: "", latitude: 0, longitude: 0 });
  const categories = data?.categories ?? [];
  const vehicles = data?.vehicles ?? [];
  const pickupLocations = data?.pickupLocations ?? [];
  const bookings = data?.bookings ?? [];

  async function createCategory() {
    if (!category.name.trim()) return;
    await apiFetch("/admin/transport-categories", { method: "POST", body: JSON.stringify({ ...category, isActive: true }) });
    setCategory({ name: "", mode: "Normal", description: "" });
    refresh();
  }

  async function updateCategory(item: TransportCategory) {
    const name = window.prompt("Category name", item.name);
    if (!name) return;
    const description = window.prompt("Description", item.description) ?? item.description;
    await apiFetch(`/admin/transport-categories/${item.id}`, { method: "PATCH", body: JSON.stringify({ name, description }) });
    refresh();
  }

  async function createVehicle() {
    if (!vehicle.categoryId || !vehicle.name.trim()) return;
    await apiFetch("/admin/vehicles", { method: "POST", body: JSON.stringify({ ...vehicle, isAvailable: true }) });
    setVehicle({ categoryId: "", mode: "Normal", name: "", type: "", price: 0, capacity: 4, image: "", description: "" });
    refresh();
  }

  async function updateVehicle(item: VehicleOption) {
    const name = window.prompt("Vehicle name", item.name);
    if (!name) return;
    const price = Number(window.prompt("Price", String(item.price)) ?? item.price);
    await apiFetch(`/admin/vehicles/${item.id}`, { method: "PATCH", body: JSON.stringify({ name, price }) });
    refresh();
  }

  async function createPickup() {
    if (!pickup.destinationSlug || !pickup.label.trim() || !pickup.address.trim()) return;
    await apiFetch("/admin/pickup-locations", { method: "POST", body: JSON.stringify({ ...pickup, isActive: true }) });
    setPickup({ destinationSlug: "", destinationName: "", label: "", type: "Airport", address: "", latitude: 0, longitude: 0 });
    refresh();
  }

  async function updateBooking(id: string, patch: Partial<TransportBooking>) {
    try {
      await apiFetch(`/admin/transport-bookings/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      refresh();
      if (patch.assignmentConfirmed) {
        toast({ title: "Success", description: "Driver assigned successfully." });
      } else {
        toast({ title: "Success", description: "Booking updated." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update booking", variant: "destructive" });
    }
  }

  async function deleteBooking(id: string) {
    try {
      await apiFetch(`/admin/transport-bookings/${id}`, { method: "DELETE" });
      refresh();
      toast({ title: "Deleted", description: "Transport request deleted successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete booking", variant: "destructive" });
    }
  }

  const panel = "rounded-3xl border border-stone-100 bg-white p-5 shadow-sm";
  const input = "h-10 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-300";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-stone-900">Transport & Pickup Management</h2>
        <p className="text-sm text-stone-400 mt-0.5">Manage transport modes, vehicles, pickup locations, pricing, availability, driver assignment and booking statuses.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className={panel}>
          <h3 className="font-black text-stone-900">Transport Categories</h3>
          <div className="mt-4 grid gap-2">
            <input className={input} placeholder="Category name" value={category.name} onChange={e => setCategory(v => ({ ...v, name: e.target.value }))} />
            <select className={input} value={category.mode} onChange={e => setCategory(v => ({ ...v, mode: e.target.value as any }))}>
              <option>Normal</option><option>VIP</option><option>VVIP</option>
            </select>
            <input className={input} placeholder="Description" value={category.description} onChange={e => setCategory(v => ({ ...v, description: e.target.value }))} />
            <button onClick={createCategory} className="h-10 rounded-xl bg-indigo-600 text-sm font-bold text-white">Add Category</button>
          </div>
          <div className="mt-4 space-y-2">
            {categories.map(item => (
              <div key={item.id} className="rounded-2xl bg-stone-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <b>{item.mode} · {item.name}</b>
                  <div className="flex gap-2 text-xs font-bold">
                    <button onClick={() => updateCategory(item)} className="text-indigo-600">Edit</button>
                    <button onClick={() => void apiFetch(`/admin/transport-categories/${item.id}`, { method: "DELETE" }).then(refresh)} className="text-rose-500">Delete</button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-stone-400">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={panel}>
          <h3 className="font-black text-stone-900">Vehicles</h3>
          <div className="mt-4 grid gap-2">
            <select className={input} value={vehicle.mode} onChange={e => setVehicle(v => ({ ...v, mode: e.target.value as any, categoryId: "" }))}>
              <option>Normal</option><option>VIP</option><option>VVIP</option>
            </select>
            <select className={input} value={vehicle.categoryId} onChange={e => setVehicle(v => ({ ...v, categoryId: e.target.value }))}>
              <option value="">Select category</option>
              {categories.filter(item => item.mode === vehicle.mode).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input className={input} placeholder="Vehicle name e.g. Mercedes-Benz" value={vehicle.name} onChange={e => setVehicle(v => ({ ...v, name: e.target.value }))} />
            <input className={input} placeholder="Type e.g. Luxury Chauffeur" value={vehicle.type} onChange={e => setVehicle(v => ({ ...v, type: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <input className={input} type="number" placeholder="Price" value={vehicle.price} onChange={e => setVehicle(v => ({ ...v, price: Number(e.target.value) }))} />
              <input className={input} type="number" placeholder="Capacity" value={vehicle.capacity} onChange={e => setVehicle(v => ({ ...v, capacity: Number(e.target.value) }))} />
            </div>
            <input className={input} placeholder="Description" value={vehicle.description} onChange={e => setVehicle(v => ({ ...v, description: e.target.value }))} />
            <button onClick={createVehicle} className="h-10 rounded-xl bg-indigo-600 text-sm font-bold text-white">Add Vehicle</button>
          </div>
          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
            {vehicles.map(item => (
              <div key={item.id} className="rounded-2xl bg-stone-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <b>{item.mode} · {item.name}</b>
                  <span className="font-black text-indigo-600">₹{item.price.toLocaleString("en-IN")}</span>
                </div>
                <p className="mt-1 text-xs text-stone-400">{item.type} · Capacity {item.capacity}</p>
                <div className="mt-2 flex gap-2 text-xs font-bold">
                  <button onClick={() => updateVehicle(item)} className="text-indigo-600">Edit</button>
                  <button onClick={() => void apiFetch(`/admin/vehicles/${item.id}`, { method: "DELETE" }).then(refresh)} className="text-rose-500">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={panel}>
          <h3 className="font-black text-stone-900">Pickup Locations</h3>
          <div className="mt-4 grid gap-2">
            <select className={input} value={pickup.destinationSlug} onChange={e => {
              const dest = dests.find(item => item.slug === e.target.value);
              setPickup(v => ({ ...v, destinationSlug: e.target.value, destinationName: dest?.name ?? "" }));
            }}>
              <option value="">Select destination</option>
              {dests.map(dest => <option key={dest.id} value={dest.slug}>{dest.name}</option>)}
            </select>
            <select className={input} value={pickup.type} onChange={e => setPickup(v => ({ ...v, type: e.target.value }))}>
              <option>Airport</option><option>Railway Station</option><option>Bus Stand</option><option>Hotel</option><option>Custom Location</option>
            </select>
            <input className={input} placeholder="Label e.g. Mumbai Airport" value={pickup.label} onChange={e => setPickup(v => ({ ...v, label: e.target.value }))} />
            <input className={input} placeholder="Address" value={pickup.address} onChange={e => setPickup(v => ({ ...v, address: e.target.value }))} />
            <button onClick={createPickup} className="h-10 rounded-xl bg-indigo-600 text-sm font-bold text-white">Add Pickup</button>
          </div>
          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
            {pickupLocations.map(item => (
              <div key={item.id} className="rounded-2xl bg-stone-50 p-3 text-sm">
                <b>{item.destinationName} · {item.label}</b>
                <p className="mt-1 text-xs text-stone-400">{item.type} · {item.address}</p>
                <button onClick={() => void apiFetch(`/admin/pickup-locations/${item.id}`, { method: "DELETE" }).then(refresh)} className="mt-2 text-xs font-bold text-rose-500">Delete</button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={panel}>
        <div className="flex items-center justify-between">
          <h3 className="font-black text-stone-900">Pickup Requests & Driver Assignment</h3>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">{bookings.length} bookings</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-stone-400">
              <tr><th className="p-3">Traveler</th><th>Trip</th><th>Pickup</th><th>Vehicle</th><th>Amount</th><th>Status</th><th>Assign</th><th>Action</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {bookings.map(item => (
                <BookingRow 
                  key={item.id} 
                  item={item} 
                  updateBooking={updateBooking} 
                  deleteBooking={deleteBooking} 
                />
              ))}
              {bookings.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-stone-400">No pickup requests yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: "overview",     label: "Overview",     icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
  { id: "activity",     label: "Activity",     icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { id: "users",        label: "Users",        icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { id: "reviews",      label: "Reviews",      icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
  { id: "destinations", label: "Destinations", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" },
  { id: "packages",     label: "Packages",     icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { id: "transport",    label: "Transport",    icon: "M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4L2 10v6h2m9 0h2m-8 0h8m4 0h1v-5l-3-4h-4" },
  { id: "inquiries",    label: "Inquiries",    icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" },
  { id: "stories",      label: "Stories",      icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
];

// ── StoriesTab ─────────────────────────────────────────────────────────────
function StoriesTab() {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStories(); }, []);

  const fetchStories = async () => {
    setLoading(true);
    const res = await apiFetch<{stories: any[]}>("/admin/stories").catch(() => null);
    if (res?.stories) setStories(res.stories);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string, isFeatured?: boolean) => {
    const update: any = { status };
    if (isFeatured !== undefined) update.isFeatured = isFeatured;
    await apiFetch(`/admin/stories/${id}/status`, { method: "PATCH", body: JSON.stringify(update) });
    fetchStories();
  };

  const deleteStory = async (id: string) => {
    if (!confirm("Delete this story?")) return;
    await apiFetch(`/admin/stories/${id}`, { method: "DELETE" });
    fetchStories();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-stone-900">Traveller Stories</h2>
          <p className="mt-1 text-sm text-stone-500">Moderate social stories and feature them on the homepage.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stories.map(story => (
          <div key={story.id} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <img src={story.images?.[0] || "/images/unsplash-451710d2942a.jpg"} className="w-full h-48 object-cover" />
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-stone-900">{story.userId?.name || "Unknown"}</div>
                  <div className="text-xs text-stone-500">{story.destinationId?.name}</div>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${story.status === "approved" ? "bg-emerald-100 text-emerald-700" : story.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                    {story.status || "approved"}
                  </span>
                  {story.isFeatured && <span className="px-2 py-1 text-[10px] font-bold rounded-full uppercase bg-indigo-100 text-indigo-700">Featured</span>}
                </div>
              </div>
              <p className="text-sm text-stone-600 line-clamp-3">{story.review}</p>
              <div className="flex justify-between gap-2 border-t border-stone-100 pt-3">
                <select 
                  className="text-xs border border-stone-200 rounded px-2 py-1"
                  value={story.status || "approved"}
                  onChange={(e) => updateStatus(story.id, e.target.value, story.isFeatured)}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button 
                  onClick={() => updateStatus(story.id, story.status || "approved", !story.isFeatured)}
                  className={`text-xs px-3 py-1 rounded font-bold transition ${story.isFeatured ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}
                >
                  {story.isFeatured ? "Unfeature" : "Feature"}
                </button>
                <button onClick={() => deleteStory(story.id)} className="text-xs px-3 py-1 rounded bg-rose-100 text-rose-700 font-bold hover:bg-rose-200">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PackageModal ─────────────────────────────────────────────────────────
function PackageModal({ initial, dests, onSave, onClose }: { initial: any; dests: CustomDest[]; onSave: (data: any, id?: string) => Promise<void>; onClose: () => void; }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [destinationId, setDestinationId] = useState(() => {
    if (!initial?.destinationId) return "";
    if (typeof initial.destinationId === "string") return initial.destinationId;
    return initial.destinationId.id || initial.destinationId._id || "";
  });
  const [duration, setDuration] = useState(initial?.duration || "");
  const [price, setPrice] = useState(initial?.price || 0);
  const [coverImage, setCoverImage] = useState(initial?.coverImage || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const inp = "w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition";
  const lbl = "block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5";

  async function handleImagePick(file: File) {
    setUploading(true);
    try {
      const serveUrl = await uploadMediaToCloudinary(file, "wandr/packages");
      setCoverImage(serveUrl);
    } catch (err: any) { alert(err.message); }
    setUploading(false);
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ title, destinationId, duration, price, coverImage, description, maxTravellers: 10, availableSeats: 10 }, initial?.id);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <h2 className="text-xl font-black text-stone-900">{initial ? "Edit Package" : "Add Package"}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-stone-400 hover:bg-stone-50 hover:text-stone-600"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div><label className={lbl}>Title</label><input className={inp} placeholder="e.g. Goa Beach Retreat" value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div><label className={lbl}>Destination</label>
            <select className={inp} value={destinationId} onChange={e => setDestinationId(e.target.value)}>
              <option value="">Select destination</option>
              {dests.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Duration</label><input className={inp} placeholder="e.g. 3 Days / 2 Nights" value={duration} onChange={e => setDuration(e.target.value)} /></div>
            <div><label className={lbl}>Price (₹)</label><input className={inp} type="number" placeholder="15000" value={price || ""} onChange={e => setPrice(Number(e.target.value))} /></div>
          </div>
          <div><label className={lbl}>Cover Image</label>
            <div className="flex gap-2 items-center">
              {coverImage && <img src={coverImage} alt="" className="w-16 h-16 rounded-xl object-cover" />}
              <label className="cursor-pointer bg-stone-100 px-4 py-2 rounded-xl text-sm font-semibold text-stone-600 hover:bg-stone-200 transition">
                {uploading ? "Uploading..." : "Upload Image"}
                <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleImagePick(e.target.files[0])} disabled={uploading} />
              </label>
            </div>
          </div>
          <div><label className={lbl}>Description</label><textarea className={inp} rows={3} placeholder="Describe the package..." value={description} onChange={e => setDescription(e.target.value)} /></div>
        </div>
        <div className="border-t border-stone-100 bg-stone-50 px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-stone-600 hover:bg-stone-200 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-xl bg-indigo-600 font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition">
            {saving ? "Saving..." : initial ? "Save Changes" : "Add Package"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main AdminPage ─────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, loading: authLoading, signIn, register, signOut } = useUser();
  const [, navigate] = useLocation();
  const [tab, setTab]   = useState<Tab>("overview");
  const [adminMode, setAdminMode] = useState<"signin" | "setup">("signin");
  const [adminName, setAdminName] = useState("Journey Junction Admin");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoginError, setAdminLoginError] = useState("");
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats,   setStats]   = useState<AdminStats | null>(null);
  const [users,   setUsers]   = useState<AdminUser[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [dests,   setDests]   = useState<CustomDest[]>([]);
  const [packages, setPackages] = useState<AdminPackage[]>([]);
  const [activity, setActivity] = useState<AdminActivityResponse | null>(null);
  const [transportData, setTransportData] = useState<TransportAdminData | null>(null);
  const [modal,   setModal]   = useState<{ open: boolean; editing: CustomDest | null }>({ open: false, editing: null });
  const [pkgModal, setPkgModal] = useState<{ open: boolean; editing: any }>({ open: false, editing: null });
  const [inquiries, setInquiries] = useState<AdminInquiry[]>([]);

  const fetchReviews = useCallback(async (includePhotos = false) => {
    if (!user?.isAdmin) return;
    const query = includePhotos ? "?limit=50&photos=1" : "?limit=10";
    const result = await apiFetch<{ reviews: AdminReview[] }>(`/admin/reviews${query}`).catch(() => null);
    if (result) {
      setReviews(result.reviews);
      if (includePhotos) setReviewsLoaded(true);
    }
  }, [user?.isAdmin]);

  const fetchEverything = useCallback(async (isPolling = false) => {
    if (!user?.isAdmin) return;
    if (!isPolling) setLoading(true);
    try {
      const [s, inq, u, d, a, categories, vehicles, pickupLocations, bookings, pkgs] = await Promise.all([
        apiFetch<AdminStats>("/admin/stats").catch((err: any) => {
          if (err?.status === 401) {
            window.location.reload();
          }
          return null;
        }),
        apiFetch<AdminInquiry[]>("/v1/inquiries").catch(() => []),
        apiFetch<{ users: AdminUser[] }>("/admin/users").catch(() => null),
        apiFetch<{ destinations: CustomDest[] }>("/admin/destinations?limit=100").catch(() => null),
        apiFetch<AdminActivityResponse>("/admin/activity").catch(() => null),
        apiFetch<{ categories: TransportCategory[] }>("/admin/transport-categories").catch(() => null),
        apiFetch<{ vehicles: VehicleOption[] }>("/admin/vehicles").catch(() => null),
        apiFetch<{ pickupLocations: PickupLocationOption[] }>("/admin/pickup-locations").catch(() => null),
        apiFetch<{ bookings: TransportBooking[] }>("/admin/transport-bookings").catch(() => null),
        apiFetch<{ items: AdminPackage[] }>("/v1/packages?limit=100").catch(() => null),
      ]);
      if (s) setStats(s);
      if (inq) setInquiries(inq as AdminInquiry[]);
      if (u) setUsers(u.users);
      if (d) setDests(d.destinations);
      if (a) setActivity(a);
      if (pkgs) setPackages(pkgs.items);
      if (categories && vehicles && pickupLocations && bookings) {
        setTransportData({
          categories: categories.categories,
          vehicles: vehicles.vehicles,
          pickupLocations: pickupLocations.pickupLocations,
          bookings: bookings.bookings,
        });
      }
    } catch { /* silently ignore */ } finally {
      if (!isPolling) setLoading(false);
    }
  }, [user?.isAdmin]);

  useEffect(() => {
    if (!user?.isAdmin) return;
    void fetchEverything(false);
    void fetchReviews(false);
    const interval = setInterval(() => fetchEverything(true), 30000);
    return () => clearInterval(interval);
  }, [fetchEverything, fetchReviews, user?.isAdmin]);

  useEffect(() => {
    if (user?.isAdmin && tab === "reviews" && !reviewsLoaded) {
      void fetchReviews(true);
    }
  }, [fetchReviews, reviewsLoaded, tab, user?.isAdmin]);

  async function handleAdminLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminLoginError("");
    setAdminLoginLoading(true);
    try {
      if (adminMode === "setup") {
        await register(adminName.trim() || "Journey Junction Admin", adminEmail.trim(), adminPassword);
      } else {
        await signIn(adminEmail.trim(), adminPassword);
      }
    } catch (err: any) {
      setAdminLoginError(
        err.message ||
        (adminMode === "setup"
          ? "Could not create admin account. If this email already exists, switch to Sign in."
          : "Admin login failed. Use the password created for this account."),
      );
    } finally {
      setAdminLoginLoading(false);
    }
  }

  async function handleDeleteUser(id: string) {
    await apiFetch(`/admin/users/${id}`, { method: "DELETE" });
    setUsers(p => p.filter(u => u.id !== id));
    setStats(p => p ? { ...p, users: p.users - 1 } : p);
    void fetchEverything();
  }

  async function handleDeleteReview(id: string) {
    await apiFetch(`/admin/reviews/${id}`, { method: "DELETE" });
    setReviews(p => p.filter(r => r.id !== id));
    setStats(p => p ? { ...p, reviews: p.reviews - 1 } : p);
    void fetchEverything();
  }

  async function handleSaveDest(data: Record<string, unknown>, id?: string) {
    try {
      if (id) {
        const { destination } = await apiFetch<{ destination: CustomDest }>(`/admin/destinations/${id}`, { method: "PATCH", body: JSON.stringify(data) });
        setDests(p => p.map(d => d.id === id ? destination : d));
      } else {
        const { destination } = await apiFetch<{ destination: CustomDest }>("/admin/destinations", { method: "POST", body: JSON.stringify(data) });
        setDests(p => [destination, ...p]);
        setStats(p => p ? { ...p, destinations: p.destinations + 1 } : p);
      }
      void fetchEverything();
    } catch (err: any) {
      alert(err.message || "Failed to save destination. Ensure you have admin access.");
    }
  }

  async function handleDeleteDest(id: string) {
    try {
      await apiFetch(`/admin/destinations/${id}`, { method: "DELETE" });
      setDests(p => p.filter(d => d.id !== id));
      setStats(p => p ? { ...p, destinations: p.destinations - 1 } : p);
      void fetchEverything();
    } catch (err: any) {
      alert(err.message || "Failed to delete destination. Ensure you have admin access.");
    }
  }

  async function handleEditDest(destination: CustomDest) {
    try {
      const data = await apiFetch<{ destination: CustomDest }>(`/admin/destinations/${destination.id}`);
      setModal({ open: true, editing: data.destination });
    } catch {
      setModal({ open: true, editing: destination });
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center text-white">
        <div className="h-10 w-10 rounded-full border-4 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-stone-950 text-white flex items-center justify-center">
        {/* Travel Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/unsplash-a6836391f181.jpg')" }}
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        <div className="relative z-10 w-full max-w-5xl px-5 py-12 mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Content */}
            <div className="hidden lg:block">
              <button onClick={() => navigate("/")} className="mb-12 inline-flex items-center gap-2 text-sm font-bold text-white/70 hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                Back to Journey Junction
              </button>
              
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-8 shadow-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h1 className="text-5xl font-black leading-[1.1] sm:text-6xl text-white mb-6">
                Journey Junction Admin Portal
              </h1>
              <p className="text-lg leading-relaxed text-white/80 max-w-md">
                Manage destinations, bookings, transport, hotels, reviews, users, itineraries, and platform operations from a centralized dashboard.
              </p>
            </div>

            {/* Login Form */}
            <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
              <button onClick={() => navigate("/")} className="mb-8 lg:hidden inline-flex items-center gap-2 text-sm font-bold text-white/70 hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                Back to Journey Junction
              </button>

              <form 
                onSubmit={(e) => {
                  setAdminMode("signin"); // Force signin mode
                  handleAdminLogin(e);
                }} 
                className="rounded-[2rem] border border-white/20 bg-white/10 p-8 sm:p-10 shadow-[0_0_50px_rgba(0,0,0,0.3)] backdrop-blur-xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-sky-400" />
                
                <div className="mb-8 text-center">
                  <h2 className="text-3xl font-black text-white tracking-tight">Admin Sign In</h2>
                  <p className="mt-3 text-sm text-white/60">
                    Secure access for Journey Junction staff only
                  </p>
                </div>
                
                <div className="space-y-5">
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wider text-white/70 ml-1 mb-2 block">Admin Email</span>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>
                      </div>
                      <input 
                        value={adminEmail} 
                        onChange={e => setAdminEmail(e.target.value)} 
                        type="email" 
                        required 
                        className="h-14 w-full rounded-2xl border border-white/20 bg-white/5 pl-12 pr-4 text-base font-semibold text-white placeholder-white/30 outline-none backdrop-blur-md focus:border-indigo-400 focus:bg-white/10 focus:ring-4 focus:ring-indigo-400/20 transition-all" 
                        placeholder="admin@journeyjunction.com" 
                      />
                    </div>
                  </label>
                  
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wider text-white/70 ml-1 mb-2 block">Password</span>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      </div>
                      <input 
                        value={adminPassword} 
                        onChange={e => setAdminPassword(e.target.value)} 
                        type="password" 
                        required 
                        minLength={6} 
                        className="h-14 w-full rounded-2xl border border-white/20 bg-white/5 pl-12 pr-4 text-base font-semibold text-white placeholder-white/30 outline-none backdrop-blur-md focus:border-indigo-400 focus:bg-white/10 focus:ring-4 focus:ring-indigo-400/20 transition-all" 
                        placeholder="••••••••" 
                      />
                    </div>
                  </label>
                </div>
                
                {adminLoginError && (
                  <div className="mt-6 rounded-2xl bg-rose-500/20 border border-rose-500/30 px-4 py-3 text-sm font-medium text-rose-200 flex items-start gap-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {adminLoginError}
                  </div>
                )}
                
                <button 
                  disabled={adminLoginLoading} 
                  className="mt-8 h-14 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-base font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {adminLoginLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      Authenticating...
                    </span>
                  ) : "Sign In"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-stone-100 sticky top-0 z-40 flex-shrink-0">
        <div className="px-6 h-14 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-stone-500 hover:text-stone-900 transition-colors text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            Wandr
          </button>
          <div className="w-px h-5 bg-stone-200"/>
          <h1 className="font-extrabold text-stone-900">Admin Panel</h1>
          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wide">Admin</span>
          <div className="ml-auto text-xs text-stone-400 hidden sm:block flex items-center gap-4">
            <NotificationCenter users={users} reviews={reviews} inquiries={inquiries} transportData={transportData} />
            <span className="ml-4 border-l border-stone-200 pl-4">{user?.email}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — desktop */}
        <aside className="w-56 flex-shrink-0 border-r border-stone-100 bg-white hidden md:flex flex-col py-6 px-3 gap-1">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors w-full text-left ${tab === item.id ? "bg-indigo-50 text-indigo-700" : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"}`}
            >
              <svg className={`w-4 h-4 ${tab === item.id ? "text-indigo-500" : "text-stone-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon}/>
              </svg>
              {item.label}
            </button>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6">
          {tab === "overview"     && <OverviewTab stats={stats} users={users} reviews={reviews} dests={dests} inquiries={inquiries} transportData={transportData} />}
          {tab === "activity"     && <ActivityTab activity={activity}/>}
          {tab === "users"        && <UsersTab users={users} onDelete={handleDeleteUser}/>}
          {tab === "reviews"      && <ReviewsTab reviews={reviews} dests={dests} onDelete={handleDeleteReview}/>}
          {tab === "inquiries"    && <InquiriesTab inquiries={inquiries} setInquiries={setInquiries}/>}
          {tab === "destinations" && <ManagedDestinationsTab dests={dests} onAdd={() => setModal({ open: true, editing: null })} onEdit={handleEditDest} onDelete={handleDeleteDest}/>}
          {tab === "packages" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-stone-500">Manage packages and select which appear in the Trending Packages section.</p>
                <button onClick={() => setPkgModal({ open: true, editing: null })} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                  Add Package
                </button>
              </div>
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50 text-left">
                      <th className="px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Package</th>
                      <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide text-center">Status</th>
                      <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide text-center">Trending / Featured</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {packages.map(p => (
                      <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <img src={p.coverImage} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-stone-100"/>
                            <div className="min-w-0">
                              <p className="font-bold text-stone-900 truncate">{p.title}</p>
                              <p className="text-xs font-medium text-stone-400 truncate">{p.duration}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${p.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>{p.status}</span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button 
                              onClick={async () => {
                                const originalState = p.featured;
                                // Optimistic update
                                setPackages(packages.map(pkg => pkg.id === p.id ? { ...pkg, featured: !p.featured } : pkg));
                                try {
                                  await apiFetch(`/v1/packages/${p.id}`, { method: "PUT", body: JSON.stringify({ featured: !p.featured }) });
                                  // Optionally fetch everything in the background
                                  void fetchEverything(true);
                                } catch(e: any) { 
                                  // Revert optimistic update
                                  setPackages(packages.map(pkg => pkg.id === p.id ? { ...pkg, featured: originalState } : pkg));
                                  alert(`Failed to update status: ${e.message || 'Unknown error'}. Did you restart the backend server?`); 
                                }
                              }}
                              className={`relative w-11 h-6 rounded-full transition-colors inline-block align-middle ${p.featured ? "bg-indigo-600" : "bg-stone-200"}`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${p.featured ? "translate-x-5" : "translate-x-0"}`}/>
                            </button>
                            <button onClick={() => setPkgModal({ open: true, editing: p })} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition">
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {packages.length === 0 && <tr><td colSpan={3} className="px-5 py-10 text-center text-sm text-stone-400">No packages found in the database.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {tab === "transport"    && <TransportTab data={transportData} dests={dests} refresh={() => void fetchEverything()} />}
          {tab === "stories"      && <StoriesTab />}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-100 flex">
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-[10px] font-semibold transition-colors ${tab === item.id ? "text-indigo-600" : "text-stone-400"}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon}/>
            </svg>
            {item.label}
          </button>
        ))}
      </nav>

      {modal.open && (
        <DestModal
          initial={modal.editing}
          onSave={handleSaveDest}
          onClose={() => setModal({ open: false, editing: null })}
        />
      )}

      {pkgModal.open && (
        <PackageModal 
          initial={pkgModal.editing}
          dests={dests}
          onClose={() => setPkgModal({ open: false, editing: null })}
          onSave={async (data, id) => {
            try {
              if (id) await apiFetch(`/v1/packages/${id}`, { method: "PUT", body: JSON.stringify(data) });
              else await apiFetch("/v1/packages", { method: "POST", body: JSON.stringify(data) });
              setPkgModal({ open: false, editing: null });
              void fetchEverything(true);
            } catch (err: any) { alert(err.message); }
          }}
        />
      )}
    </div>
  );
}
