import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/context/UserContext";
import { useWishlist } from "@/context/WishlistContext";
import { apiFetch } from "@/lib/api";
import { getDestinationById } from "@/data/destinations";
import ProfileDropdown from "@/components/ProfileDropdown";
import SignInModal from "@/components/SignInModal";

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

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-sky-400",
  "from-violet-500 to-purple-400",
  "from-rose-500 to-pink-400",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-orange-400",
  "from-sky-500 to-cyan-400",
];

function getGradient(name: string) {
  const code = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function WandrLogo({ className = "" }: { className?: string }) {
  return (
    <img src="/logo.png" alt="Journey Junction" className={className} />
  );
}

function StatTile({ label, value, icon, tone }: { label: string; value: string | number; icon: string; tone: string }) {
  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-5 shadow-sm">
      <div className={`w-11 h-11 rounded-xl ${tone} flex items-center justify-center text-xl mb-4`}>{icon}</div>
      <div className="text-2xl font-extrabold text-stone-900">{value}</div>
      <div className="text-xs text-stone-400 font-medium mt-1">{label}</div>
    </div>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <svg key={n} className={`w-3.5 h-3.5 ${n <= rating ? "fill-amber-400 text-amber-400" : "fill-stone-200 text-stone-200"}`} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const PAYMENT_METHODS = ["UPI", "Debit/Credit Card", "Net Banking", "Wallet"];

function parseINR(value: string) {
  const numeric = value.replace(/[^0-9]/g, "");
  return numeric ? Number.parseInt(numeric, 10) : 0;
}

function formatINR(value: number) {
  return INR.format(value);
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
  if (endDiff >= 0) return "Trip in progress";
  return "Trip completed";
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
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);

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
    const interval = window.setInterval(loadDashboard, 10000);
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
  const paymentSummary = useMemo(() => {
    const destinationTotal = paidBookings.reduce((sum, booking) => sum + Number(booking.stepPrices?.destination ?? 0), 0);
    const transportTotal = paidBookings.reduce((sum, booking) => sum + Number(booking.stepPrices?.pickup ?? 0) + Number(booking.stepPrices?.vehicle ?? 0), 0);
    const serviceTotal = paidBookings.reduce((sum, booking) => sum + Number(booking.stepPrices?.service ?? 0), 0);
    const total = paidBookings.reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0);

    return {
      destinationTotal,
      transportTotal,
      serviceTotal,
      total,
    };
  }, [paidBookings]);

  if (authLoading || !user) return null;

  const gradient = getGradient(user.name);
  const avgRating = reviews.length
    ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10
    : "—";
  const bookedDestinationCount = paidBookings.length;
  const bookedServiceCount = paidBookings.reduce((sum, booking) => sum + (Number(booking.stepPrices?.service ?? 0) > 0 ? 1 : 0), 0);
  const savedPreview = destinations.slice(0, 3);
  const reviewPreview = reviews.slice(0, 3);
  const scrollToPayments = () => document.getElementById("payments")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen bg-[#f8f5f0] text-stone-800">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center">
            <WandrLogo className="h-[32px] md:h-[36px] w-auto object-contain flex-shrink-0 scale-[1.5] md:scale-[1.8] origin-left" />
          </button>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-sm font-semibold text-stone-500 hover:text-stone-900">Explore</button>
            <button onClick={() => navigate("/plan-trip")} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">Plan Trip</button>
            <ProfileDropdown onSignInClick={() => setSignInOpen(true)} />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <section className="grid lg:grid-cols-[1.4fr_0.9fr] gap-6">
          <div className={`rounded-3xl bg-gradient-to-br ${gradient} p-8 text-white shadow-sm overflow-hidden relative`}>
            <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "34px 34px" }} />
            <div className="relative flex items-start justify-between gap-6">
              <div>
                <p className="text-white/70 text-sm font-semibold mb-2">User Dashboard</p>
                <h1 className="text-4xl font-extrabold leading-tight">Welcome back, {user.name.split(" ")[0]}</h1>
                <p className="text-white/75 mt-3 max-w-xl">Track your saved places, reviews, hotels, activities, and trip planning progress from one place.</p>
              </div>
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-extrabold ring-4 ring-white/20 flex-shrink-0">
                {getInitials(user.name)}
              </div>
            </div>
            <div className="relative mt-8 flex flex-wrap gap-3">
              <button onClick={() => navigate("/wishlist")} className="px-5 py-3 rounded-full bg-white text-stone-900 text-sm font-bold hover:shadow-lg transition-shadow">View Wishlist</button>
              <button onClick={() => navigate("/profile")} className="px-5 py-3 rounded-full bg-white/15 border border-white/25 text-white text-sm font-bold hover:bg-white/20 transition-colors">Edit Profile</button>
              {user.isAdmin && (
                <button onClick={() => navigate("/admin")} className="px-5 py-3 rounded-full bg-black/20 border border-white/20 text-white text-sm font-bold hover:bg-black/30 transition-colors">Admin Panel</button>
              )}
            </div>
          </div>

          <div className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm">
            <p className="text-sm font-bold text-stone-900 mb-4">Account</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-stone-400">Name</span>
                <span className="text-sm font-semibold text-stone-800 text-right">{user.name}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-stone-400">Email</span>
                <span className="text-sm font-semibold text-stone-800 text-right truncate">{user.email}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-stone-400">Role</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${user.isAdmin ? "bg-violet-50 text-violet-700" : "bg-indigo-50 text-indigo-700"}`}>
                  {user.isAdmin ? "Admin" : "Explorer"}
                </span>
              </div>
            </div>
            <button onClick={() => navigate("/profile")} className="mt-6 w-full py-3 rounded-xl border border-stone-200 text-sm font-bold text-stone-700 hover:bg-stone-50 transition-colors">Manage Account</button>
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile label="Saved Items" value={totalCount} icon="♥" tone="bg-rose-50 text-rose-600" />
          <StatTile label="Destinations" value={bookedDestinationCount} icon="📍" tone="bg-sky-50 text-sky-600" />
          <StatTile label="Activities + Hotels" value={bookedServiceCount} icon="🎟" tone="bg-emerald-50 text-emerald-600" />
          <StatTile label="Avg Review Rating" value={avgRating} icon="★" tone="bg-amber-50 text-amber-600" />
        </section>

        <section className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-extrabold text-stone-900">My Bookings</h2>
              <p className="text-sm text-stone-400 mt-0.5">Stripe-paid trips appear here immediately after successful payment.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">{bookings.length} total</span>
          </div>

          {bookingsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-stone-50 animate-pulse" />)}
            </div>
          ) : bookings.length === 0 ? (
            <EmptyPanel title="No bookings yet" text="Book a destination and complete Stripe Checkout to see your trip here." action="Explore" onAction={() => navigate("/")} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-xs uppercase tracking-wide text-stone-400">
                    <th className="py-3 pr-4">Destination</th>
                    <th className="py-3 pr-4">Dates</th>
                    <th className="py-3 pr-4">Countdown</th>
                    <th className="py-3 pr-4">Transport</th>
                    <th className="py-3 pr-4">Amount Paid</th>
                    <th className="py-3 pr-4">Payment</th>
                    <th className="py-3 pr-4">Booking</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(booking => (
                    <tr key={booking.id} className="border-b border-stone-50 last:border-0">
                      <td className="py-4 pr-4">
                        <p className="font-extrabold text-stone-900">{booking.destinationName}</p>
                        <p className="mt-0.5 text-xs text-stone-400">{booking.bookingReference}</p>
                      </td>
                      <td className="py-4 pr-4 text-stone-600">{booking.checkInDate} to {booking.checkOutDate}</td>
                      <td className="py-4 pr-4 text-stone-600">{tripCountdownLabel(booking)}</td>
                      <td className="py-4 pr-4 text-stone-600">{booking.travelMode} - {booking.vehicle?.name ?? "Vehicle"}</td>
                      <td className="py-4 pr-4 font-extrabold text-stone-900">{formatINR(booking.totalAmount)}</td>
                      <td className="py-4 pr-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${booking.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {booking.paymentStatus}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-extrabold text-indigo-700">{booking.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-stone-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-extrabold text-stone-900">Saved Destinations</h2>
                <p className="text-sm text-stone-400 mt-0.5">{destinations.length} places in your wishlist</p>
              </div>
              <button onClick={() => navigate("/wishlist")} className="text-sm font-bold text-indigo-600 hover:text-indigo-800">View all</button>
            </div>

            {savedPreview.length === 0 ? (
              <EmptyPanel title="No saved destinations yet" text="Explore destinations and tap the heart icon to save your favourites." action="Explore" onAction={() => navigate("/")} />
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                {savedPreview.map(destination => (
                  <button key={destination.id} onClick={() => navigate(`/destination/${destination.id}`)} className="text-left rounded-2xl overflow-hidden border border-stone-100 bg-stone-50 hover:shadow-md transition-shadow">
                    <img src={destination.heroImage} alt={destination.name} className="w-full h-32 object-cover" />
                    <div className="p-4">
                      <p className="font-bold text-stone-900 truncate">{destination.name}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{destination.state} · {destination.region}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-stone-900 mb-5">Quick Actions</h2>
            <div className="space-y-3">
              {[
                { label: "Plan a trip", path: "/plan-trip", tone: "bg-indigo-600 text-white" },
                { label: "Payments", path: "#payments", tone: "bg-emerald-50 text-emerald-700" },
                { label: "Browse destinations", path: "/", tone: "bg-stone-100 text-stone-800" },
                { label: "Open wishlist", path: "/wishlist", tone: "bg-rose-50 text-rose-700" },
                { label: "Profile settings", path: "/profile", tone: "bg-sky-50 text-sky-700" },
              ].map(action => (
                <button key={action.label} onClick={() => action.path === "#payments" ? scrollToPayments() : navigate(action.path)} className={`w-full px-4 py-3 rounded-xl text-sm font-bold text-left ${action.tone} hover:opacity-90 transition-opacity`}>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="payments" className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 scroll-mt-24">
          <div className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-stone-900">Payments</h2>
                <p className="text-sm text-stone-400 mt-0.5">Stripe payment history from completed Journey Junction checkouts.</p>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-extrabold">INR</div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mb-5">
              <div className="rounded-2xl bg-stone-50 border border-stone-100 p-4">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Destinations</p>
                <p className="text-2xl font-extrabold text-stone-900 mt-1">{formatINR(paymentSummary.destinationTotal)}</p>
              </div>
              <div className="rounded-2xl bg-stone-50 border border-stone-100 p-4">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Transport</p>
                <p className="text-2xl font-extrabold text-stone-900 mt-1">{formatINR(paymentSummary.transportTotal)}</p>
              </div>
              <div className="rounded-2xl bg-stone-50 border border-stone-100 p-4">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Hotels + Meals</p>
                <p className="text-2xl font-extrabold text-stone-900 mt-1">{formatINR(paymentSummary.serviceTotal)}</p>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-stone-100 p-4">
              <PaymentLine label="Paid bookings" value={paidBookings.length} plain />
              <PaymentLine label="Destination total" value={paymentSummary.destinationTotal} />
              <PaymentLine label="Transport total" value={paymentSummary.transportTotal} />
              <PaymentLine label="Hotel, meal and services" value={paymentSummary.serviceTotal} />
              <div className="border-t border-stone-100 pt-3 flex items-center justify-between">
                <span className="text-sm font-extrabold text-stone-900">Total paid</span>
                <span className="text-2xl font-extrabold text-indigo-700">{formatINR(paymentSummary.total)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-stone-900 mb-4">Payment History</h2>
            {paidBookings.length === 0 ? (
              <EmptyPanel title="No paid bookings yet" text="Complete Stripe Checkout to see your payment history here." action="Explore" onAction={() => navigate("/")} />
            ) : (
              <div className="space-y-3">
                {paidBookings.map(item => (
                  <div key={item.id} className="rounded-xl bg-stone-50 border border-stone-100 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-stone-900 truncate">{item.destinationName}</p>
                        <p className="text-xs text-stone-400 mt-0.5">{new Date(item.paidAt ?? item.createdAt).toLocaleDateString("en-IN")} - {item.paymentStatus}</p>
                      </div>
                      <p className="text-sm font-extrabold text-stone-800 whitespace-nowrap">{formatINR(item.totalAmount)}</p>
                    </div>
                    <div className="mt-2 rounded-lg bg-white px-3 py-2 text-[10px] text-stone-400 break-all">
                      Transaction: {item.stripePaymentIntentId || item.stripeCheckoutSessionId || item.bookingReference}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-extrabold text-stone-900">Recent Reviews</h2>
                <p className="text-sm text-stone-400 mt-0.5">{reviews.length} reviews written</p>
              </div>
              <button onClick={() => navigate("/profile")} className="text-sm font-bold text-indigo-600 hover:text-indigo-800">Profile</button>
            </div>

            {reviewsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-stone-50 animate-pulse" />)}
              </div>
            ) : reviewPreview.length === 0 ? (
              <EmptyPanel title="No reviews yet" text="Write a review from any destination page to help other travellers." action="Explore" onAction={() => navigate("/")} />
            ) : (
              <div className="space-y-3">
                {reviewPreview.map(review => {
                  const destination = getDestinationById(review.destId);
                  return (
                    <button key={review.id} onClick={() => navigate(`/destination/${review.destId}`)} className="w-full text-left p-4 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-stone-900 truncate">{review.title}</p>
                        <StarRow rating={review.rating} />
                      </div>
                      <p className="text-xs text-stone-400 mt-1">{destination?.name ?? review.destId} · {review.tripType}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white border border-stone-100 rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-stone-900 mb-5">Wishlist Breakdown</h2>
            <div className="space-y-4">
              <BreakdownRow label="Destinations" value={destinations.length} total={Math.max(totalCount, 1)} color="bg-sky-500" />
              <BreakdownRow label="Activities" value={activities.length} total={Math.max(totalCount, 1)} color="bg-emerald-500" />
              <BreakdownRow label="Hotels" value={hotels.length} total={Math.max(totalCount, 1)} color="bg-amber-500" />
            </div>
          </div>
        </section>
      </main>

      {signInOpen && <SignInModal onClose={() => setSignInOpen(false)} />}
    </div>
  );
}

function PaymentLine({ label, value, plain = false }: { label: string; value: number; plain?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="font-bold text-stone-800">{plain ? value : formatINR(value)}</span>
    </div>
  );
}

function EmptyPanel({ title, text, action, onAction }: { title: string; text: string; action: string; onAction: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 py-12 px-6 text-center">
      <p className="font-bold text-stone-800">{title}</p>
      <p className="text-sm text-stone-400 mt-1 max-w-sm mx-auto">{text}</p>
      <button onClick={onAction} className="mt-5 px-5 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">
        {action}
      </button>
    </div>
  );
}

function BreakdownRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percent = Math.round((value / total) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="font-semibold text-stone-700">{label}</span>
        <span className="text-stone-400">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
