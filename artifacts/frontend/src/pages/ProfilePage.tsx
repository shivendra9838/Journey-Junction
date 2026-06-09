import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/context/UserContext";
import type { UserProfile } from "@/context/UserContext";
import { apiFetch } from "@/lib/api";


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

const TRIP_COLORS: Record<string, string> = {
  Solo:     "bg-sky-50 text-sky-700 border-sky-100",
  Couple:   "bg-rose-50 text-rose-700 border-rose-100",
  Family:   "bg-emerald-50 text-emerald-700 border-emerald-100",
  Business: "bg-amber-50 text-amber-700 border-amber-100",
  Friends:  "bg-violet-50 text-violet-700 border-violet-100",
};

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

function WandrLogo({ className = "" }: { className?: string }) {
  return (
    <img src="/logo.png" alt="Journey Junction" className={className} />
  );
}

function AvatarPreview({
  name,
  avatarUrl,
  gradient,
  size = "lg",
}: {
  name: string;
  avatarUrl: string;
  gradient: string;
  size?: "sm" | "lg";
}) {
  const [imgOk, setImgOk] = useState(false);
  const [imgError, setImgError] = useState(false);
  const prevUrl = useRef(avatarUrl);

  useEffect(() => {
    if (avatarUrl !== prevUrl.current) {
      prevUrl.current = avatarUrl;
      setImgOk(false);
      setImgError(false);
    }
  }, [avatarUrl]);

  const sizeClasses = size === "lg"
    ? "w-20 h-20 text-2xl"
    : "w-12 h-12 text-base";

  const showImage = avatarUrl.trim() !== "" && !imgError;

  return (
    <div className={`${sizeClasses} rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold shadow-lg ring-4 ring-white flex-shrink-0 overflow-hidden relative`}>
      {showImage && (
        <img
          src={avatarUrl}
          alt="avatar"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${imgOk ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setImgOk(true)}
          onError={() => setImgError(true)}
        />
      )}
      <span className={showImage && imgOk ? "opacity-0" : "opacity-100"}>
        {getInitials(name || "?")}
      </span>
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
  const [name, setName]         = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar ?? "");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const [pwExpanded, setPwExpanded] = useState(false);
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwError, setPwError]       = useState("");
  const [pwSuccess, setPwSuccess]   = useState(false);

  const gradient = getGradient(name.trim() || user.name);

  async function handleSave() {
    if (!name.trim()) { setError("Display name is required."); return; }
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setSaving(true);
      setError("");
      const res = await fetch("/api/users/me/avatar-upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload avatar");
      }
      setAvatarUrl(data.avatarUrl);
    } catch (err: any) {
      setError(err.message || "Failed to upload avatar");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange() {
    if (!currentPw)        { setPwError("Enter your current password."); return; }
    if (newPw.length < 6)  { setPwError("New password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setPwError("New passwords don't match."); return; }
    setPwError("");
    setPwSuccess(false);
    setPwSaving(true);
    try {
      await apiFetch("/users/me/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      setPwSuccess(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => { setPwExpanded(false); setPwSuccess(false); }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setPwError(msg.toLowerCase().includes("incorrect")
        ? "Current password is incorrect."
        : "Failed to update password. Please try again.");
    } finally {
      setPwSaving(false);
    }
  }

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-stone-100">
          <h2 className="text-lg font-extrabold text-stone-900">Edit Profile</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-7 py-6 space-y-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          {/* Avatar preview */}
          <div className="flex items-center gap-5">
            <AvatarPreview name={name} avatarUrl={avatarUrl} gradient={gradient} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-700 mb-1">Avatar</p>
              <p className="text-xs text-stone-400 leading-relaxed">
                Upload a photo from your computer, or leave blank to use your initials.
              </p>
              {avatarUrl.trim() && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl("")}
                  className="mt-2 text-xs text-rose-500 hover:text-rose-700 font-medium transition-colors"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>

          {/* Avatar Photo Upload */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              Profile Photo
            </label>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
              className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-stone-300 text-sm font-semibold text-stone-600 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              Click to upload a new photo
            </button>
          </div>

          {/* Name input */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              Display name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              placeholder="Your name"
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              Email <span className="text-stone-300 font-normal text-xs">(cannot be changed)</span>
            </label>
            <div className="w-full px-4 py-2.5 rounded-xl border border-stone-100 bg-stone-50 text-sm text-stone-400 select-none">
              {user.email}
            </div>
          </div>

          {/* Change password section */}
          <div className="border-t border-stone-100 pt-1">
            <button
              type="button"
              onClick={() => {
                setPwExpanded(v => !v);
                setPwError("");
                setPwSuccess(false);
              }}
              className="flex items-center justify-between w-full py-2 text-sm font-semibold text-stone-600 hover:text-indigo-600 transition-colors group"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-stone-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                Change password
              </span>
              <svg className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${pwExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            {pwExpanded && (
              <div className="mt-3 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Current password</label>
                  <input
                    type="password"
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    New password
                    <span className="text-stone-400 font-normal text-xs ml-1">(min. 6 characters)</span>
                  </label>
                  <input
                    type="password"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Confirm new password</label>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                  />
                </div>

                {pwError && (
                  <p className="text-sm text-rose-500 font-medium">{pwError}</p>
                )}

                {pwSuccess && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 font-semibold">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                    </svg>
                    Password updated successfully!
                  </div>
                )}

                <button
                  type="button"
                  onClick={handlePasswordChange}
                  disabled={pwSaving || !currentPw || !newPw || !confirmPw}
                  className="w-full py-2.5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {pwSaving ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
                      </svg>
                      Updating…
                    </>
                  ) : "Update password"}
                </button>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-rose-500 font-medium">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 pb-7 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
                </svg>
                Saving…
              </>
            ) : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading: authLoading, updateProfile } = useUser();
  const [, navigate] = useLocation();
  const [reviews, setReviews]       = useState<MyReview[]>([]);
  const [fetching, setFetching]     = useState(true);
  const [editOpen, setEditOpen]     = useState(false);
  const [dests, setDests]           = useState<any[]>([]);

  useEffect(() => {
    apiFetch("/destinations?limit=100").then((d: any) => setDests(d.destinations || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/"); return; }
    apiFetch<{ reviews: MyReview[] }>("/users/me/reviews")
      .then(d => setReviews(d.reviews))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user, authLoading, navigate]);

  if (authLoading || !user) return null;

  const gradient    = getGradient(user.name);
  const avgRating   = reviews.length > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;
  const uniqueDests  = new Set(reviews.map(r => r.destId)).size;
  const totalHelpful = reviews.reduce((s, r) => s + r.helpful, 0);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Nav */}
      <header className="bg-white border-b border-stone-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back to Journey Junction
          </button>
          <WandrLogo className="h-[32px] md:h-[36px] w-auto object-contain flex-shrink-0 scale-[1.5] md:scale-[1.8] origin-left" />
          <div className="w-24" />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Profile hero card */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
          <div className={`bg-gradient-to-br ${gradient} h-28`} />
          <div className="px-8 pb-8">
            <div className="flex items-end gap-5 -mt-10 mb-6">
              {/* Avatar */}
              <AvatarPreview
                name={user.name}
                avatarUrl={user.avatar ?? ""}
                gradient={gradient}
                size="lg"
              />

              <div className="pb-1 flex-1 min-w-0">
                <h1 className="text-2xl font-extrabold text-stone-900 leading-tight">{user.name}</h1>
                <p className="text-stone-400 text-sm mt-0.5">{user.email}</p>
                <p className="text-stone-400 text-xs mt-1">Journey Junction Explorer</p>
              </div>

              <div className="pb-1 flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => setEditOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-stone-200 text-stone-600 text-sm font-semibold hover:bg-stone-50 hover:border-stone-300 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                  Edit Profile
                </button>
                <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100">
                  Explorer
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Reviews Written", value: reviews.length,                              icon: "✍️" },
                { label: "Avg Rating Given", value: avgRating > 0 ? avgRating.toFixed(1) : "—", icon: "⭐" },
                { label: "Destinations",     value: uniqueDests,                                icon: "🗺️" },
                { label: "Helpful Votes",    value: totalHelpful,                               icon: "👍" },
              ].map(s => (
                <div key={s.label} className="bg-stone-50 rounded-2xl p-4 text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-2xl font-extrabold text-stone-900">{s.value}</div>
                  <div className="text-xs text-stone-400 font-medium mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews list */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-extrabold text-stone-900">My Reviews</h2>
              <p className="text-sm text-stone-400 mt-0.5">
                {reviews.length === 0
                  ? "You haven't written any reviews yet"
                  : `${reviews.length} review${reviews.length !== 1 ? "s" : ""} across ${uniqueDests} destination${uniqueDests !== 1 ? "s" : ""}`}
              </p>
            </div>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Explore Destinations
            </button>
          </div>

          {fetching ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-stone-100 p-5 animate-pulse">
                  <div className="flex gap-3 mb-4">
                    <div className="w-16 h-16 rounded-xl bg-stone-100 flex-shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3 bg-stone-100 rounded-full w-2/3" />
                      <div className="h-3 bg-stone-100 rounded-full w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-stone-100 rounded-full" />
                    <div className="h-3 bg-stone-100 rounded-full w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-100 py-20 text-center">
              <div className="text-5xl mb-4">✍️</div>
              <h3 className="text-lg font-bold text-stone-900 mb-2">No reviews yet</h3>
              <p className="text-stone-400 text-sm max-w-xs mx-auto mb-6">
                Visit a destination page and share your experience to help fellow travellers.
              </p>
              <button
                onClick={() => navigate("/")}
                className="px-6 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Explore Destinations
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {reviews.map(r => {
                const dest  = dests.find(d => d.id === r.destId);
                const date  = new Date(r.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                const isLong = r.review.length > 140;
                return (
                  <div
                    key={r.id}
                    className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-4"
                  >
                    <button
                      onClick={() => dest && navigate(`/destination/${dest.id}`)}
                      className="flex items-center gap-3 group text-left"
                    >
                      {dest ? (
                        <img
                          src={dest.heroImage}
                          alt={dest.name}
                          className="w-14 h-14 rounded-xl object-cover flex-shrink-0 group-hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-stone-100 flex items-center justify-center text-2xl flex-shrink-0">🗺️</div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-stone-900 group-hover:text-indigo-600 transition-colors truncate leading-tight">
                          {dest?.name ?? r.destId}
                        </div>
                        <div className="text-xs text-stone-400 mt-0.5">{dest?.state}, {dest?.country}</div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <StarRow rating={r.rating} />
                          <span className="text-xs font-semibold text-stone-700">{STAR_LABELS[r.rating]}</span>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-stone-300 group-hover:text-indigo-400 transition-colors ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                      </svg>
                    </button>

                    <div>
                      <p className="text-sm font-semibold text-stone-900 mb-1">{r.title}</p>
                      <p className="text-sm text-stone-500 leading-relaxed">
                        {isLong ? r.review.slice(0, 140) + "…" : r.review}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-stone-50">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TRIP_COLORS[r.tripType] ?? "bg-stone-50 text-stone-600 border-stone-100"}`}>
                          {r.tripType}
                        </span>
                        <span className="text-xs text-stone-400">{date}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-stone-400">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>
                        </svg>
                        <span>{r.helpful} found helpful</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editOpen && (
        <EditProfileModal
          user={user}
          onSave={updateProfile}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
