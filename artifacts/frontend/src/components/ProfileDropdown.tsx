import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { io } from "socket.io-client";
import { useUser } from "@/context/UserContext";
import { useWishlist } from "@/context/WishlistContext";
import { apiFetch } from "@/lib/api";

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

interface Props { onSignInClick: () => void; }

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

export default function ProfileDropdown({ onSignInClick }: Props) {
  const { user, signOut } = useUser();
  const { totalCount } = useWishlist();
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [selectedInquiryData, setSelectedInquiryData] = useState<any>(null);
  const [, navigate] = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  async function openInquiry(id: string) {
    setSelectedInquiryId(id);
    setSelectedInquiryData(null);
    try {
      const response = await apiFetch<any>(`/v1/inquiries/${id}`);
      setSelectedInquiryData(response.inquiry || response);
    } catch (e) {
      alert("Failed to load inquiry details");
      setSelectedInquiryId(null);
    }
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let cancelled = false;
    async function loadNotifications() {
      try {
        const data = await apiFetch<{ notifications: NotificationItem[]; unreadCount: number }>("/notifications");
        if (!cancelled) {
          setNotifications(data.notifications ?? []);
          setUnreadCount(data.unreadCount ?? 0);
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    }

    void loadNotifications();
    const interval = window.setInterval(loadNotifications, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const socket = io("/", {
      path: "/socket.io",
      withCredentials: true,
      auth: { userId: user.id },
      query: { userId: user.id },
    });
    socket.on("notification", (item: NotificationItem) => {
      setNotifications(list => {
        if (list.some(notification => notification.id === item.id)) return list;
        return [item, ...list].slice(0, 30);
      });
      if (!item.isRead) setUnreadCount(count => count + 1);
    });
    return () => {
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (open && user && reviewCount === null) {
      apiFetch<{ reviews: { id: string }[] }>("/users/me/reviews")
        .then(d => setReviewCount(d.reviews.length))
        .catch(() => setReviewCount(0));
    }
  }, [open, user, reviewCount]);

  useEffect(() => {
    setReviewCount(null);
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/plan-trip")}
          className="md:hidden text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors px-1"
        >
          Plan Trip
        </button>
        <button
          onClick={onSignInClick}
          className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors px-1"
        >Sign in</button>
        <button
          onClick={onSignInClick}
          className="px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
        >Get Started</button>
      </div>
    );
  }

  const gradient = getGradient(user.name);
  const initials = getInitials(user.name);

  function go(path: string) {
    setOpen(false);
    setNotificationsOpen(false);
    navigate(path);
  }

  function handleSignOut() {
    setOpen(false);
    setNotificationsOpen(false);
    signOut();
  }

  async function markNotificationRead(item: NotificationItem) {
    if (!item.isRead) {
      setNotifications(list => list.map(notification => notification.id === item.id ? { ...notification, isRead: true } : notification));
      setUnreadCount(count => Math.max(0, count - 1));
      await apiFetch(`/notifications/${item.id}/read`, { method: "PATCH" }).catch(() => undefined);
    }
  }

  async function deleteNotification(id: string) {
    setNotifications(list => {
      const wasUnread = list.find(n => n.id === id)?.isRead === false;
      if (wasUnread) setUnreadCount(count => Math.max(0, count - 1));
      return list.filter(n => n.id !== id);
    });
    await apiFetch(`/notifications/${id}`, { method: "DELETE" }).catch(() => undefined);
  }

  async function markAllRead() {
    if (unreadCount === 0) return;
    setNotifications(list => list.map(item => ({ ...item, isRead: true })));
    setUnreadCount(0);
    await apiFetch("/notifications/read-all", { method: "POST" }).catch(() => undefined);
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setNotificationsOpen(o => !o);
            setOpen(false);
          }}
          className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-stone-100 transition-colors"
          aria-label="Notifications"
        >
          <svg className="h-5 w-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 01-6 0m6 0H9"/>
          </svg>
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 min-w-[18px] rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setOpen(o => !o);
            setNotificationsOpen(false);
          }}
          className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-stone-100 transition-colors group"
        >
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0`}>
            {initials}
          </div>
          <span className="text-sm font-semibold text-stone-700 group-hover:text-stone-900 max-w-[90px] truncate hidden sm:block">
            {user.name}
          </span>
          <svg className={`w-3.5 h-3.5 text-stone-400 transition-transform ${open ? "rotate-180" : ""} hidden sm:block`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      </div>

      {notificationsOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-xl z-[310]">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <div>
              <p className="text-sm font-black text-stone-900">Notifications</p>
              <p className="text-xs text-stone-400">{unreadCount} unread</p>
            </div>
            <button onClick={markAllRead} className="text-xs font-bold text-indigo-600 disabled:text-stone-300" disabled={unreadCount === 0}>
              Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.map(item => (
              <div
                key={item.id}
                className={`group relative w-full border-b border-stone-50 px-4 py-3 text-left transition-colors hover:bg-stone-50 ${item.isRead ? "bg-white" : "bg-indigo-50/60"}`}
              >
                <div 
                  className="flex items-start gap-3 cursor-pointer pr-6"
                  onClick={() => {
                    markNotificationRead(item);
                    if (item.type === "admin_reply" && item.relatedEntityId) {
                      openInquiry(item.relatedEntityId);
                      setNotificationsOpen(false);
                    } else if (item.link) {
                      go(item.link);
                    }
                  }}
                >
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.isRead ? "bg-stone-200" : "bg-indigo-600"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-stone-900">{item.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-stone-500">{item.message}</span>
                    <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-300">
                      {new Date(item.createdAt).toLocaleString("en-IN")}
                    </span>
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(item.id);
                  }}
                  className="absolute right-3 top-3 p-1 text-stone-300 opacity-0 group-hover:opacity-100 hover:text-stone-600 hover:bg-stone-200 rounded-full transition-all"
                  title="Dismiss notification"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-stone-400">No notifications yet.</div>
            )}
          </div>
        </div>
      )}

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-stone-100 z-[300] overflow-hidden">
          {/* Profile header */}
          <div className={`bg-gradient-to-br ${gradient} p-5`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center text-white text-lg font-bold shadow-sm flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-white font-bold text-base leading-tight truncate">{user.name}</div>
                <div className="text-white/70 text-xs truncate mt-0.5">{user.email}</div>
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-semibold">Explorer</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 divide-x divide-stone-100 border-b border-stone-100">
            {[
              { label: "Wishlist", value: totalCount,                          onClick: () => go("/wishlist") },
              { label: "Trips",    value: 0,                                   onClick: () => go("/plan-trip") },
              { label: "Reviews",  value: reviewCount ?? "—",                  onClick: () => go("/profile") },
            ].map(s => (
              <button key={s.label} onClick={s.onClick}
                className="flex flex-col items-center py-3 hover:bg-stone-50 transition-colors">
                <span className="text-lg font-extrabold text-stone-900">{s.value}</span>
                <span className="text-[10px] text-stone-400 font-medium">{s.label}</span>
              </button>
            ))}
          </div>

          {/* Menu items */}
          <div className="p-2">
            {[
              {
                icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>,
                label: "Dashboard",
                badge: null,
                onClick: () => go("/dashboard"),
                color: "text-sky-500",
              },
              {
                icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m0-6h3a2 2 0 012 2v2a2 2 0 01-2 2h-3m0-6v6"/></svg>,
                label: "Payments",
                badge: null,
                onClick: () => go("/dashboard#payments"),
                color: "text-emerald-500",
              },
              {
                icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>,
                label: "My Wishlist",
                badge: totalCount > 0 ? totalCount : null,
                onClick: () => go("/wishlist"),
                color: "text-rose-500",
              },
              {
                icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>,
                label: "My Trips",
                badge: null,
                onClick: () => go("/plan-trip"),
                color: "text-indigo-500",
              },
              {
                icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
                label: "My Reviews",
                badge: reviewCount && reviewCount > 0 ? reviewCount : null,
                onClick: () => go("/profile"),
                color: "text-amber-500",
              },
              ...(user.isAdmin ? [{
                icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
                label: "Admin Panel",
                badge: null,
                onClick: () => go("/admin"),
                color: "text-violet-500",
              }] : []),
              {
                icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
                label: "Help & Support",
                badge: null,
                onClick: () => {
                  setOpen(false);
                  window.dispatchEvent(new Event("open-support-chat"));
                },
                color: "text-stone-500",
              },
            ].map(item => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-stone-50 transition-colors text-left group"
              >
                <span className={`${item.color} group-hover:scale-110 transition-transform`}>{item.icon}</span>
                <span className="flex-1 text-sm font-medium text-stone-700">{item.label}</span>
                {item.badge !== null && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold">{item.badge}</span>
                )}
                <svg className="w-3 h-3 text-stone-300 group-hover:text-stone-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            ))}
          </div>

          {/* Sign out */}
          <div className="px-2 pb-2 pt-0">
            <div className="border-t border-stone-100 pt-2">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors text-left group"
              >
                <svg className="w-4 h-4 text-red-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
                <span className="text-sm font-medium text-red-500 group-hover:text-red-600">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedInquiryId && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl relative">
            <button onClick={() => setSelectedInquiryId(null)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-900">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
            <h3 className="text-xl font-black text-stone-900 mb-4">Inquiry Reply</h3>
            {selectedInquiryData ? (
               <div className="space-y-4">
                 <div className="p-4 bg-stone-50 rounded-2xl">
                   <p className="text-xs text-stone-500 uppercase font-bold mb-1">Your Inquiry ({selectedInquiryData.destination})</p>
                   <p className="text-sm text-stone-700">{selectedInquiryData.message}</p>
                 </div>
                 {selectedInquiryData.replyMessage && (
                   <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                     <p className="text-xs text-indigo-500 uppercase font-bold mb-1">Expert Reply</p>
                     <p className="text-sm text-indigo-900 whitespace-pre-wrap">{selectedInquiryData.replyMessage}</p>
                   </div>
                 )}
               </div>
            ) : (
              <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
