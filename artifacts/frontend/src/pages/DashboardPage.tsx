import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/context/UserContext";
import { useWishlist } from "@/context/WishlistContext";
import { apiFetch } from "@/lib/api";
import Navbar from "@/components/Navbar";
import SignInModal from "@/components/SignInModal";
import LoadingState from "@/components/LoadingState";

interface MyReview {
  id: string;
  destId: string;
  tripType: string;
  rating: number;
  title: string;
  review: string;
  helpful: number;
  createdAt: string;
}

interface TransportBooking {
  id: string;
  bookingReference: string;
  destinationSlug?: string;
  destinationName: string;
  checkInDate: string;
  checkOutDate: string;
  travelMode: string;
  totalAmount: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
  paidAt?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stepPrices?: { destination?: number; pickup?: number; vehicle?: number; service?: number };
  vehicle?: { name?: string; type?: string };
}

type RecommendedDestination = {
  id: string;
  name: string;
  state: string;
  image: string;
  rating: number;
  tag: string;
};

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const FALLBACK_IMAGE = "/images/unsplash-be41aa2e4372.jpg";

const RECOMMENDED_DESTINATIONS: RecommendedDestination[] = [
  { id: "goa", name: "Goa", state: "Goa", image: "/images/unsplash-be41aa2e4372.jpg", rating: 4.8, tag: "Beach escape" },
  { id: "kerala", name: "Kerala", state: "Kerala", image: "/images/unsplash-451710d2942a.jpg", rating: 4.9, tag: "Backwaters" },
  { id: "kashmir", name: "Kashmir", state: "Jammu & Kashmir", image: "/images/unsplash-1925bee154dc.jpg", rating: 4.9, tag: "Mountain retreat" },
  { id: "rajasthan", name: "Rajasthan", state: "Rajasthan", image: "/images/unsplash-a6836391f181.jpg", rating: 4.7, tag: "Royal heritage" },
];

function formatINR(value: number) {
  return INR.format(value);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function daysUntil(date: string) {
  const target = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function tripCountdownLabel(booking: TransportBooking) {
  const startDiff = daysUntil(booking.checkInDate);
  const endDiff = daysUntil(booking.checkOutDate);
  if (startDiff > 0) return `${startDiff} day${startDiff === 1 ? "" : "s"} left`;
  if (endDiff >= 0) return "In progress";
  return "Completed";
}

function SafeImage({ src, alt, className }: { src?: string; alt: string; className: string }) {
  const [currentSrc, setCurrentSrc] = useState(src || FALLBACK_IMAGE);

  useEffect(() => {
    setCurrentSrc(src || FALLBACK_IMAGE);
  }, [src]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => {
        if (currentSrc !== FALLBACK_IMAGE) setCurrentSrc(FALLBACK_IMAGE);
      }}
    />
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useUser();
  const { destinations, activities, hotels, totalCount } = useWishlist();
  const [, navigate] = useLocation();
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [bookings, setBookings] = useState<TransportBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [signInOpen, setSignInOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/");
      return;
    }

    let cancelled = false;
    async function loadDashboard() {
      try {
        const [reviewsData, bookingsData] = await Promise.all([
          apiFetch<{ reviews: MyReview[] }>("/users/me/reviews"),
          apiFetch<{ bookings: TransportBooking[] }>("/users/me/transport-bookings"),
        ]);
        if (!cancelled) {
          setReviews(reviewsData.reviews ?? []);
          setBookings(bookingsData.bookings ?? []);
        }
      } catch {
        if (!cancelled) {
          setReviews([]);
          setBookings([]);
        }
      } finally {
        if (!cancelled) {
          setReviewsLoading(false);
          setBookingsLoading(false);
        }
      }
    }

    void loadDashboard();
    const interval = window.setInterval(loadDashboard, 30000);
    const onFocus = () => void loadDashboard();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (authLoading || !user || window.location.hash !== "#payments") return;
    const timeout = window.setTimeout(() => {
      document.getElementById("payments")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => window.clearTimeout(timeout);
  }, [user, authLoading]);

  const paidBookings = useMemo(() => bookings.filter(booking => booking.paymentStatus === "paid"), [bookings]);
  const pendingBookings = useMemo(() => bookings.filter(booking => booking.paymentStatus !== "paid"), [bookings]);
  const upcomingTrip = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return bookings
      .filter(booking => new Date(`${booking.checkOutDate}T00:00:00`) >= now)
      .sort((a, b) => new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime())[0];
  }, [bookings]);
  const paymentTotal = useMemo(() => paidBookings.reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0), [paidBookings]);
  const latestPaidBookings = paidBookings.slice(0, 4);

  if (authLoading) return <LoadingState fullscreen message="Loading your dashboard..." />;
  if (!user) return null;

  const firstName = user.name.split(" ")[0] || "Traveller";
  const savedDestinations = destinations.slice(0, 8);
  const recentReviews = reviews.slice(0, 3);
  const statItems = [
    { label: "Wishlist", value: totalCount, icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", tone: "text-rose-500 bg-rose-50" },
    { label: "Bookings", value: bookings.length, icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", tone: "text-indigo-600 bg-indigo-50" },
    { label: "Reviews", value: reviews.length, icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.889a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.977-2.889a1 1 0 00-1.176 0l-3.977 2.889c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L3.075 10.1c-.783-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.521-4.674z", tone: "text-amber-600 bg-amber-50" },
    { label: "Saved Places", value: destinations.length, icon: "M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z", tone: "text-sky-600 bg-sky-50" },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8f5f0] text-stone-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-20 md:px-8 md:pt-24">
        <section className="flex h-[96px] items-center justify-between gap-4 rounded-3xl bg-white/90 p-4 shadow-sm ring-1 ring-stone-100 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-sky-400 text-base font-black text-white shadow-sm">
              {getInitials(user.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black tracking-tight text-stone-950">Welcome back, {firstName}</p>
              <p className="mt-0.5 truncate text-sm font-medium text-stone-500">Ready for your next adventure?</p>
            </div>
          </div>
          <button aria-label="Notifications" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-stone-100 bg-stone-50 text-stone-700 transition active:scale-95">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 01-6 0" />
            </svg>
          </button>
        </section>

        <section className="-mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
          {statItems.map(item => (
            <div key={item.label} className="h-[90px] w-[120px] shrink-0 snap-start rounded-3xl border border-stone-100 bg-white p-4 shadow-sm">
              <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${item.tone}`}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
              </div>
              <div className="mt-2 text-xl font-black leading-none">{item.value}</div>
              <div className="mt-1 text-[11px] font-bold text-stone-400">{item.label}</div>
            </div>
          ))}
        </section>

        <DashboardSection title="Upcoming trip" className="mt-6">
          {bookingsLoading ? (
            <TripSkeleton />
          ) : upcomingTrip ? (
            <TripCard booking={upcomingTrip} onView={() => navigate(`/destination/${upcomingTrip.destinationSlug || upcomingTrip.destinationName.toLowerCase()}`)} />
          ) : (
            <EmptyState
              title="No trips yet"
              text="Let's plan your first adventure."
              action="Plan your first trip"
              onAction={() => navigate("/plan-trip")}
            />
          )}
        </DashboardSection>

        <DashboardSection title="Saved destinations" action="View all" onAction={() => navigate("/wishlist")} className="mt-6">
          {savedDestinations.length === 0 ? (
            <EmptyState
              title="No saved places"
              text="Start exploring India and save places you love."
              action="Start exploring"
              onAction={() => navigate("/")}
            />
          ) : (
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3">
              {savedDestinations.map(destination => (
                <button
                  key={destination.id}
                  onClick={() => navigate(`/destination/${destination.id}`)}
                  className="w-[236px] shrink-0 snap-start overflow-hidden rounded-3xl border border-stone-100 bg-white text-left shadow-sm transition active:scale-[0.99]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <SafeImage src={destination.heroImage} alt={destination.name} className="h-full w-full object-cover" />
                    <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-black text-stone-900 shadow-sm">
                      {destination.rating.toFixed(1)}
                    </div>
                    <div className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur">
                      <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="truncate text-sm font-black text-stone-950">{destination.name}</p>
                    <p className="mt-0.5 truncate text-xs font-medium text-stone-500">{destination.state}</p>
                    <div className="mt-3 inline-flex rounded-full bg-indigo-600 px-4 py-2 text-xs font-black text-white">Explore</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DashboardSection>

        <DashboardSection title="Quick actions" className="mt-6">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Plan Trip", path: "/plan-trip", tone: "bg-indigo-600 text-white", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" },
              { label: "Wishlist", path: "/wishlist", tone: "bg-rose-50 text-rose-700", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682" },
              { label: "Payments", path: "#payments", tone: "bg-emerald-50 text-emerald-700", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2" },
              { label: "Profile", path: "/profile", tone: "bg-sky-50 text-sky-700", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0z" },
            ].map(action => (
              <button
                key={action.label}
                onClick={() => action.path === "#payments" ? document.getElementById("payments")?.scrollIntoView({ behavior: "smooth" }) : navigate(action.path)}
                className={`min-h-[88px] rounded-3xl p-4 text-left shadow-sm transition active:scale-[0.98] ${action.tone}`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                </svg>
                <p className="mt-3 text-sm font-black">{action.label}</p>
              </button>
            ))}
          </div>
        </DashboardSection>

        <DashboardSection title="Recommended for you" className="mt-6">
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3">
            {RECOMMENDED_DESTINATIONS.map(destination => (
              <button
                key={destination.id}
                onClick={() => navigate(`/destination/${destination.id}`)}
                className="w-[220px] shrink-0 snap-start overflow-hidden rounded-3xl bg-white text-left shadow-sm ring-1 ring-stone-100"
              >
                <div className="relative aspect-[4/3]">
                  <SafeImage src={destination.image} alt={destination.name} className="h-full w-full object-cover" />
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-stone-900">{destination.rating}</span>
                </div>
                <div className="p-4">
                  <p className="text-sm font-black text-stone-950">{destination.name}</p>
                  <p className="mt-1 text-xs font-semibold text-stone-500">{destination.tag}</p>
                </div>
              </button>
            ))}
          </div>
        </DashboardSection>

        <DashboardSection title="Payments" className="mt-6" id="payments">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
            <div className="grid grid-cols-3 gap-3">
              <PaymentMetric label="Total Spent" value={formatINR(paymentTotal)} />
              <PaymentMetric label="Bookings" value={paidBookings.length} />
              <PaymentMetric label="Pending" value={pendingBookings.length} />
            </div>
            <button
              onClick={() => setPaymentsOpen(open => !open)}
              className="mt-4 h-12 w-full rounded-2xl bg-stone-950 text-sm font-black text-white"
            >
              {paymentsOpen ? "Hide Details" : "View Details"}
            </button>
            {paymentsOpen && (
              <div className="mt-4 space-y-3">
                {latestPaidBookings.length === 0 ? (
                  <EmptyState
                    title="No payments yet"
                    text="Complete a booking to see payment details."
                    action="Explore trips"
                    onAction={() => navigate("/")}
                    compact
                  />
                ) : latestPaidBookings.map(booking => (
                  <div key={booking.id} className="rounded-2xl bg-stone-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-stone-900">{booking.destinationName}</p>
                        <p className="mt-0.5 text-xs text-stone-500">{booking.bookingReference}</p>
                      </div>
                      <p className="shrink-0 text-sm font-black text-stone-950">{formatINR(booking.totalAmount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DashboardSection>

        <DashboardSection title="Travel activity" className="mt-6">
          {reviewsLoading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map(item => <div key={item} className="h-16 animate-pulse rounded-2xl bg-white" />)}
            </div>
          ) : recentReviews.length === 0 ? (
            <EmptyState
              title="No reviews yet"
              text="Share your first travel moment after a trip."
              action="Browse places"
              onAction={() => navigate("/")}
              compact
            />
          ) : (
            <div className="grid gap-3">
              {recentReviews.map(review => (
                <button key={review.id} onClick={() => navigate(`/destination/${review.destId}`)} className="rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-stone-100">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-black text-stone-950">{review.title}</p>
                    <span className="shrink-0 text-xs font-black text-amber-600">{review.rating}.0</span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs font-medium text-stone-500">{review.review}</p>
                </button>
              ))}
            </div>
          )}
        </DashboardSection>
      </main>

      {signInOpen && <SignInModal onClose={() => setSignInOpen(false)} />}
    </div>
  );
}

function DashboardSection({
  title,
  action,
  onAction,
  children,
  className = "",
  id,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-black tracking-tight text-stone-950">{title}</h2>
        {action && onAction && (
          <button onClick={onAction} className="text-sm font-black text-indigo-600">{action}</button>
        )}
      </div>
      {children}
    </section>
  );
}

function TripCard({ booking, onView }: { booking: TransportBooking; onView: () => void }) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-sm ring-1 ring-stone-100">
      <div className="relative h-44">
        <SafeImage src={FALLBACK_IMAGE} alt={booking.destinationName} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">{tripCountdownLabel(booking)}</p>
          <h3 className="mt-1 line-clamp-1 text-2xl font-black">{booking.destinationName}</h3>
        </div>
        <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-black capitalize text-stone-900">
          {booking.status}
        </span>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-stone-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-stone-400">Dates</p>
            <p className="mt-1 font-bold text-stone-900">{booking.checkInDate}</p>
          </div>
          <div className="rounded-2xl bg-stone-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-stone-400">Payment</p>
            <p className="mt-1 font-bold capitalize text-emerald-700">{booking.paymentStatus}</p>
          </div>
        </div>
        <button onClick={onView} className="mt-4 h-12 w-full rounded-2xl bg-indigo-600 text-sm font-black text-white">
          View itinerary
        </button>
      </div>
    </div>
  );
}

function PaymentMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-stone-50 p-3 text-center">
      <p className="text-[10px] font-black uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-stone-950">{value}</p>
    </div>
  );
}

function EmptyState({
  title,
  text,
  action,
  onAction,
  compact = false,
}: {
  title: string;
  text: string;
  action: string;
  onAction: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-[1.75rem] border border-dashed border-indigo-100 bg-white p-5 text-center shadow-sm ${compact ? "py-6" : "py-8"}`}>
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-50 to-sky-50 text-indigo-600">
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-black text-stone-950">{title}</h3>
      <p className="mx-auto mt-1 max-w-xs text-sm leading-6 text-stone-500">{text}</p>
      <button onClick={onAction} className="mt-5 h-11 rounded-full bg-stone-950 px-5 text-sm font-black text-white">
        {action}
      </button>
    </div>
  );
}

function TripSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-sm ring-1 ring-stone-100">
      <div className="h-44 animate-pulse bg-stone-200" />
      <div className="space-y-3 p-4">
        <div className="h-12 animate-pulse rounded-2xl bg-stone-100" />
        <div className="h-12 animate-pulse rounded-2xl bg-stone-100" />
      </div>
    </div>
  );
}
