import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/context/UserContext";
import type { UserProfile } from "@/context/UserContext";
import { useWishlist } from "@/context/WishlistContext";
import { apiFetch } from "@/lib/api";
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

interface DestinationSummary {
  id: string;
  slug?: string;
  name: string;
  state?: string;
  country?: string;
  heroImage?: string;
}

interface TransportBooking {
  id: string;
  paymentStatus: string;
}

const FALLBACK_IMAGE = "/images/unsplash-be41aa2e4372.jpg";
const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function Icon({ path, className = "h-5 w-5" }: { path: string; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    </svg>
  );
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

function Avatar({
  name,
  avatarUrl,
  className = "h-20 w-20 text-2xl",
}: {
  name: string;
  avatarUrl?: string | null;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(avatarUrl && !imageFailed);

  useEffect(() => setImageFailed(false), [avatarUrl]);

  return (
    <div className={`${className} flex shrink-0 items-center justify-center overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-indigo-600 via-sky-500 to-emerald-400 font-black text-white shadow-sm ring-4 ring-white/50`}>
      {showImage ? (
        <img src={avatarUrl ?? ""} alt={name} className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} star rating`}>
      {[1, 2, 3, 4, 5].map(star => (
        <svg key={star} className={`h-3.5 w-3.5 ${star <= rating ? "fill-amber-400 text-amber-400" : "fill-stone-200 text-stone-200"}`} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function EditProfileModal({
  user,
  onSave,
  onClose,
}: {
  user: UserProfile;
  onSave: (name: string, avatar: string | null) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    if (!name.trim()) {
      setError("Display name is required.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSave(name.trim(), avatarUrl.trim() || null);
      onClose();
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/users/me/avatar-upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload avatar");
      setAvatarUrl(data.avatarUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload avatar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/45 px-3 pb-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4" onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-[2rem] bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-stone-950">Edit profile</h2>
          <button onClick={onClose} aria-label="Close edit profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-600">
            <Icon path="M6 18L18 6M6 6l12 12" className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <div className="flex items-center gap-4">
            <Avatar name={name} avatarUrl={avatarUrl} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-stone-900">Profile photo</p>
              <p className="mt-1 text-xs leading-5 text-stone-500">Use a clear photo so hosts and travellers recognize you.</p>
            </div>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 text-sm font-black text-stone-700 disabled:opacity-50"
          >
            <Icon path="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" className="h-4 w-4" />
            Upload photo
          </button>

          <label className="block">
            <span className="text-sm font-bold text-stone-800">Display name</span>
            <input
              value={name}
              onChange={event => setName(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-stone-200 px-4 text-sm font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Your name"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-stone-800">Email</span>
            <div className="mt-2 flex min-h-12 items-center rounded-2xl bg-stone-50 px-4 text-sm font-semibold text-stone-500">
              {user.email}
            </div>
          </label>

          {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">{error}</p>}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={onClose} className="h-12 rounded-2xl border border-stone-200 text-sm font-black text-stone-700">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="h-12 rounded-2xl bg-indigo-600 text-sm font-black text-white disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  action,
  onAction,
  children,
  className = "",
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-black tracking-tight text-stone-950">{title}</h2>
        {action && onAction && (
          <button onClick={onAction} className="flex h-10 items-center rounded-full px-3 text-sm font-black text-indigo-600">
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ title, text, action, onAction }: { title: string; text: string; action: string; onAction: () => void }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-indigo-100 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600">
        <Icon path="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-lg font-black text-stone-950">{title}</h3>
      <p className="mx-auto mt-1 max-w-xs text-sm leading-6 text-stone-500">{text}</p>
      <button onClick={onAction} className="mt-5 h-11 rounded-full bg-stone-950 px-5 text-sm font-black text-white">{action}</button>
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading: authLoading, updateProfile, signOut } = useUser();
  const { destinations: savedDestinations, totalCount } = useWishlist();
  const [, navigate] = useLocation();
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [bookings, setBookings] = useState<TransportBooking[]>([]);
  const [destinations, setDestinations] = useState<DestinationSummary[]>([]);
  const [fetching, setFetching] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [openSetting, setOpenSetting] = useState<string | null>("Personal Information");

  useEffect(() => {
    let cancelled = false;
    async function loadProfileData() {
      if (authLoading || !user) return;
      setFetching(true);
      try {
        const [reviewData, destinationData, bookingData] = await Promise.all([
          apiFetch<{ reviews: MyReview[] }>("/users/me/reviews"),
          apiFetch<{ destinations: DestinationSummary[] }>("/destinations?limit=100"),
          apiFetch<{ bookings: TransportBooking[] }>("/users/me/transport-bookings").catch(() => ({ bookings: [] })),
        ]);
        if (!cancelled) {
          setReviews(reviewData.reviews ?? []);
          setDestinations(destinationData.destinations ?? []);
          setBookings(bookingData.bookings ?? []);
        }
      } catch {
        if (!cancelled) {
          setReviews([]);
          setDestinations([]);
          setBookings([]);
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    }
    void loadProfileData();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate("/");
  }, [authLoading, user, navigate]);

  const destinationById = useMemo(() => new Map(destinations.map(destination => [destination.id, destination])), [destinations]);
  const avgRating = reviews.length ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10 : 0;
  const paidTrips = bookings.filter(booking => booking.paymentStatus === "paid").length;
  const achievements = [
    "Explorer",
    reviews.length >= 3 ? "Top Reviewer" : "Review Starter",
    paidTrips > 0 ? "Trip Planner" : "Early Traveller",
  ];

  if (authLoading) return <LoadingState fullscreen message="Loading your profile..." />;
  if (!user) return null;

  async function handleLogout() {
    await signOut();
    setLogoutOpen(false);
    navigate("/");
  }

  const statItems = [
    { label: "Reviews", value: reviews.length, icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.889a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.977-2.889a1 1 0 00-1.176 0l-3.977 2.889c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L3.075 10.1c-.783-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.521-4.674z", tone: "bg-amber-50 text-amber-600" },
    { label: "Saved", value: totalCount, icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", tone: "bg-rose-50 text-rose-500" },
    { label: "Trips", value: paidTrips, icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7", tone: "bg-sky-50 text-sky-600" },
    { label: "Rating", value: avgRating ? avgRating.toFixed(1) : "-", icon: "M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9", tone: "bg-emerald-50 text-emerald-600" },
  ];

  const actionItems = [
    { label: "Edit Profile", path: "", onClick: () => setEditOpen(true), icon: "M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5a2.121 2.121 0 00-3-3L5 17v3z" },
    { label: "Wishlist", path: "/wishlist", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
    { label: "Notifications", path: "#notifications", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" },
    { label: "Payments", path: "/dashboard#payments", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  ];

  const settings = [
    { title: "Personal Information", body: `${user.name} - ${user.email}` },
    { title: "Password & Security", body: "Manage your password from Edit Profile." },
    { title: "Notifications", body: "Trip alerts, booking updates, and saved-place reminders." },
    { title: "Privacy", body: "Control what appears on your traveller profile." },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8f5f0] text-stone-900">
      <header className="sticky top-0 z-50 border-b border-stone-200/70 bg-white/90 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-[63px] max-w-5xl items-center justify-between px-4">
          <button onClick={() => navigate("/dashboard")} aria-label="Back to dashboard" className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-stone-700 active:scale-95">
            <Icon path="M15 19l-7-7 7-7" className="h-5 w-5" />
          </button>
          <h1 className="text-base font-black text-stone-950">Profile</h1>
          <button onClick={() => setOpenSetting("Personal Information")} aria-label="Profile settings" className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-stone-700 active:scale-95">
            <Icon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5">
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-stone-950 via-indigo-950 to-sky-700 p-4 shadow-sm">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" />
          <div className="relative flex min-h-[112px] items-center gap-3">
            <Avatar name={user.name} avatarUrl={user.avatar} />
            <div className="min-w-0 flex-1 text-white">
              <h2 className="truncate text-xl font-black leading-tight">{user.name}</h2>
              <p className="mt-1 truncate text-sm font-semibold text-white/80">{user.email}</p>
              <span className="mt-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-black text-white ring-1 ring-white/20">
                {user.isAdmin ? "Admin Member" : "Explorer Member"}
              </span>
            </div>
            <button onClick={() => setEditOpen(true)} aria-label="Edit profile" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/20 backdrop-blur transition active:scale-95">
              <Icon path="M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5a2.121 2.121 0 00-3-3L5 17v3z" className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="-mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
          {statItems.map(item => (
            <div key={item.label} className="h-[90px] w-[120px] shrink-0 snap-start rounded-3xl border border-stone-100 bg-white p-4 shadow-sm">
              <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${item.tone}`}>
                <Icon path={item.icon} className="h-4 w-4" />
              </div>
              <div className="mt-2 text-xl font-black leading-none">{item.value}</div>
              <div className="mt-1 text-[11px] font-bold text-stone-400">{item.label}</div>
            </div>
          ))}
        </section>

        <section className="mt-5">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {achievements.map(achievement => (
              <span key={achievement} className="shrink-0 rounded-full border border-indigo-100 bg-white px-4 py-2 text-xs font-black text-indigo-700 shadow-sm">
                {achievement}
              </span>
            ))}
          </div>
        </section>

        <Section title="My reviews" action="Write review" onAction={() => navigate("/")} className="mt-6">
          {fetching ? (
            <LoadingState message="Loading your reviews..." />
          ) : reviews.length === 0 ? (
            <EmptyState title="No reviews yet" text="Share your travel story and help other travellers plan better." action="Write your first review" onAction={() => navigate("/")} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {reviews.map(review => {
                const destination = destinationById.get(review.destId);
                return (
                  <button key={review.id} onClick={() => navigate(`/destination/${review.destId}`)} className="overflow-hidden rounded-[1.75rem] border border-stone-100 bg-white text-left shadow-sm transition active:scale-[0.99]">
                    <div className="flex gap-3 p-3">
                      <SafeImage src={destination?.heroImage} alt={destination?.name ?? review.destId} className="h-24 w-24 shrink-0 rounded-3xl object-cover" />
                      <div className="min-w-0 flex-1 py-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-black text-stone-950">{destination?.name ?? review.destId}</p>
                          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-700">{review.rating}.0</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <StarRow rating={review.rating} />
                          <span className="text-[11px] font-bold text-stone-400">{STAR_LABELS[review.rating]}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-500">{review.review}</p>
                        <p className="mt-2 text-[11px] font-bold text-stone-400">{formatDate(review.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Saved destinations" action="View all" onAction={() => navigate("/wishlist")} className="mt-7">
          {savedDestinations.length === 0 ? (
            <EmptyState title="No saved places" text="Start exploring India and keep your favorite places here." action="Explore destinations" onAction={() => navigate("/")} />
          ) : (
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3">
              {savedDestinations.slice(0, 8).map(destination => (
                <button key={destination.id} onClick={() => navigate(`/destination/${destination.id}`)} className="w-[220px] shrink-0 snap-start overflow-hidden rounded-[1.75rem] border border-stone-100 bg-white text-left shadow-sm">
                  <div className="relative h-36">
                    <SafeImage src={destination.heroImage} alt={destination.name} className="h-full w-full object-cover" />
                    <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-rose-500 shadow-sm">
                      <Icon path="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" className="h-4 w-4 fill-current" />
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-1 text-base font-black text-stone-950">{destination.name}</p>
                    <p className="mt-1 line-clamp-1 text-xs font-semibold text-stone-500">{destination.state}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-xs font-black text-amber-600">{destination.rating} rating</span>
                      <span className="rounded-full bg-indigo-600 px-3 py-1.5 text-[11px] font-black text-white">Explore</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Section>

        <Section title="Account actions" className="mt-7">
          <div className="grid grid-cols-2 gap-3">
            {actionItems.map(action => (
              <button
                key={action.label}
                onClick={() => action.onClick ? action.onClick() : navigate(action.path)}
                className="flex min-h-[88px] items-center gap-3 rounded-3xl border border-stone-100 bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
                  <Icon path={action.icon} className="h-5 w-5" />
                </span>
                <span className="text-sm font-black leading-tight text-stone-950">{action.label}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Account settings" className="mt-7">
          <div className="overflow-hidden rounded-[1.75rem] border border-stone-100 bg-white shadow-sm">
            {settings.map(setting => {
              const open = openSetting === setting.title;
              return (
                <div key={setting.title} className="border-b border-stone-100 last:border-b-0">
                  <button onClick={() => setOpenSetting(open ? null : setting.title)} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left">
                    <span className="text-sm font-black text-stone-950">{setting.title}</span>
                    <Icon path="M19 9l-7 7-7-7" className={`h-4 w-4 text-stone-400 transition ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && <p className="px-4 pb-4 text-sm leading-6 text-stone-500">{setting.body}</p>}
                </div>
              );
            })}
            <button onClick={() => setLogoutOpen(true)} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-rose-600">
              <span className="text-sm font-black">Logout</span>
              <Icon path="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" className="h-4 w-4" />
            </button>
          </div>
        </Section>

        <button onClick={() => setLogoutOpen(true)} className="mt-7 h-12 w-full rounded-2xl border border-rose-200 bg-white text-sm font-black text-rose-600 shadow-sm">
          Logout
        </button>
      </main>

      {editOpen && <EditProfileModal user={user} onSave={updateProfile} onClose={() => setEditOpen(false)} />}

      {logoutOpen && (
        <div className="fixed inset-0 z-[90] flex items-end bg-black/45 px-3 pb-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4" onClick={event => event.target === event.currentTarget && setLogoutOpen(false)}>
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-black text-stone-950">Log out?</h2>
            <p className="mt-2 text-sm leading-6 text-stone-500">You can sign in again anytime to access your bookings, wishlist, and reviews.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={() => setLogoutOpen(false)} className="h-12 rounded-2xl border border-stone-200 text-sm font-black text-stone-700">Cancel</button>
              <button onClick={handleLogout} className="h-12 rounded-2xl border border-rose-200 bg-rose-50 text-sm font-black text-rose-600">Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
