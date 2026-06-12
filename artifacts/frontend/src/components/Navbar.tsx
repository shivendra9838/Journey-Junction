import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useWishlist } from "@/context/WishlistContext";
import { useUser } from "@/context/UserContext";
import ProfileDropdown from "@/components/ProfileDropdown";
import SignInModal from "@/components/SignInModal";
import { apiFetch } from "@/lib/api";

function WandrLogo({ className = "" }: { className?: string }) {
  return (
    <img src="/logo.png" alt="Journey Junction" className={className} />
  );
}

interface DestSummary {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  stateSlug: string;
  country: string;
  region: string;
}

export default function Navbar() {
  const [, navigate] = useLocation();
  const { totalCount } = useWishlist();
  const { user, signOut } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [destinations, setDestinations] = useState<DestSummary[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showReviewMsg, setShowReviewMsg] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadDestinations() {
      try {
        const data = await apiFetch<{ destinations: DestSummary[] }>("/destinations");
        setDestinations(data.destinations ?? []);
      } catch {
        /* ignore */
      }
    }
    void loadDestinations();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const matchingDestinations = destinations.filter(d => 
    searchQuery && (
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      d.city.toLowerCase().includes(searchQuery.toLowerCase()) || 
      d.state.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ).slice(0, 5); // Max 5 suggestions

  function handleSearchSubmit(e: React.FormEvent | React.KeyboardEvent) {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (matchingDestinations.length > 0) {
      const bestMatch = matchingDestinations[0];
      const path = bestMatch.stateSlug && bestMatch.slug 
        ? `/destinations/${bestMatch.stateSlug}/${bestMatch.slug}` 
        : `/destination/${bestMatch.id}`;
      setShowDropdown(false);
      setSearchQuery("");
      navigate(path);
    } else {
      setShowDropdown(false);
      setShowReviewMsg(searchQuery.trim());
      setSearchQuery("");
      // Hide the message after 5 seconds
      setTimeout(() => setShowReviewMsg(""), 5000);
    }
  }

  function go(path: string) {
    setMobileMenuOpen(false);
    navigate(path);
  }

  async function confirmLogout() {
    await signOut();
    setLogoutConfirmOpen(false);
    setMobileMenuOpen(false);
  }

  const quickActions = [
    { label: "Plan My Trip", path: "/plan-trip", tone: "from-indigo-600 to-sky-500", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
    { label: "Wishlist", path: "/wishlist", tone: "from-rose-500 to-orange-400", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", badge: totalCount > 0 ? String(totalCount > 9 ? "9+" : totalCount) : "" },
    { label: "Dashboard", path: "/dashboard", tone: "from-emerald-500 to-teal-400", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2", authOnly: true },
  ];

  const navItems = [
    ["Home", "/"],
    ["Destinations", "/destinations"],
    ["Packages", "/packages"],
    ["Stories", "/#stories"],
    ["About Us", "/team"],
  ];

  const supportItems = [
    ["Contact", "mailto:tiwarishivendra589@gmail.com"],
    ["Help Center", "#"],
    ["Terms", "#"],
    ["Privacy", "#"],
  ];

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-50 flex h-16 max-h-16 items-center justify-between gap-2 border-b border-stone-200/70 bg-white/85 px-3 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-xl md:h-[72px] md:max-h-[72px] md:px-10">
        <div className="flex min-w-0 items-center gap-2">
          <button onClick={() => navigate("/")} className="cursor-pointer shrink-0">
            <WandrLogo className="h-8 w-auto object-contain flex-shrink-0 md:h-9 md:scale-[1.35] md:origin-left" />
          </button>
        </div>

        {/* Global Search */}
        <div className="relative w-[70%] max-w-md flex-1 md:mx-6" ref={searchRef}>
          <div className="relative group">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleSearchSubmit}
              placeholder="Search destinations"
              className="h-11 w-full rounded-full border border-stone-200/80 bg-white/90 pl-9 pr-8 text-sm font-semibold text-stone-800 shadow-sm outline-none transition-all placeholder:text-stone-400 focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setShowDropdown(false); }} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">×</button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden z-50">
              {matchingDestinations.length > 0 ? (
                <div className="py-2">
                  <div className="px-4 py-2 text-xs font-bold text-stone-400 uppercase tracking-widest">Destinations</div>
                  {matchingDestinations.map(dest => (
                    <button
                      key={dest.id}
                      onClick={() => {
                        const path = dest.stateSlug && dest.slug ? `/destinations/${dest.stateSlug}/${dest.slug}` : `/destination/${dest.id}`;
                        setShowDropdown(false);
                        setSearchQuery("");
                        navigate(path);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">📍</div>
                      <div>
                        <div className="text-sm font-bold text-stone-900">{dest.name}</div>
                        <div className="text-xs text-stone-500">{dest.state}, {dest.country}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center">
                  <div className="text-sm text-stone-900 font-medium mb-1">No exact matches</div>
                  <div className="text-xs text-stone-500 mb-3">Press Enter to search anyway.</div>
                  <button 
                    onClick={handleSearchSubmit}
                    className="w-full py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Search for "{searchQuery}"
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 md:gap-2">
          {user && (
            <button
              onClick={() => navigate("/dashboard")}
              className="hidden items-center gap-1.5 px-1 text-sm font-semibold text-sky-600 transition-colors hover:text-sky-800 md:flex"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
              Dashboard
            </button>
          )}
          <button
            onClick={() => navigate("/plan-trip")}
            className="hidden items-center gap-1.5 px-1 text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-800 md:flex"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Plan My Trip
          </button>
          <button
            onClick={() => navigate("/wishlist")}
            className="relative hidden items-center gap-1.5 px-1 text-sm font-medium text-stone-600 transition-colors hover:text-rose-500 sm:flex"
          >
            <svg className={`w-4 h-4 transition-colors ${totalCount > 0 ? "fill-rose-500 text-rose-500" : "fill-none text-stone-500"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
            Wishlist
            {totalCount > 0 && (
              <span className="absolute -right-1 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">{totalCount > 9 ? "9+" : totalCount}</span>
            )}
          </button>
          
          <button 
            className="md:hidden flex h-11 w-11 items-center justify-center rounded-full border border-stone-200/80 bg-white/90 text-stone-800 shadow-sm transition active:scale-95 hover:bg-stone-50"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>

          <div className="hidden md:block">
            <ProfileDropdown onSignInClick={() => setSignInOpen(true)} />
          </div>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      <div
        className={`fixed inset-0 z-[60] md:hidden ${mobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!mobileMenuOpen}
      >
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
          className={`absolute inset-0 bg-stone-950/35 backdrop-blur-sm transition-opacity duration-250 ${mobileMenuOpen ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          className={`absolute right-0 top-0 flex h-full w-[85%] max-w-[390px] flex-col rounded-l-[2rem] bg-[#fbfaf7] shadow-2xl transition-transform duration-250 ease-out ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex items-center justify-between px-5 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)]">
            <WandrLogo className="h-8 w-auto object-contain" />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-stone-700 shadow-sm transition active:scale-95"
              aria-label="Close navigation menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-5">
            <div className="rounded-3xl bg-gradient-to-br from-stone-950 via-stone-900 to-indigo-950 p-4 text-white shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg font-black ring-1 ring-white/20">
                  {user ? user.name.charAt(0).toUpperCase() : "J"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{user ? user.name : "Welcome traveller"}</p>
                  <p className="mt-0.5 truncate text-xs text-white/65">{user ? user.email : "Sign in for saved trips and deals"}</p>
                </div>
              </div>
              {!user && (
                <button
                  onClick={() => { setMobileMenuOpen(false); setSignInOpen(true); }}
                  className="mt-4 h-12 w-full rounded-2xl bg-white text-sm font-black text-stone-950 transition active:scale-[0.98]"
                >
                  Sign In
                </button>
              )}
            </div>

            <section className="mt-5">
              <h3 className="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">Quick actions</h3>
              <div className="mt-3 grid grid-cols-1 gap-3">
                {quickActions.filter(item => !item.authOnly || user).map(item => (
                  <button
                    key={item.label}
                    onClick={() => go(item.path)}
                    className={`group flex min-h-14 items-center gap-3 rounded-3xl bg-gradient-to-r ${item.tone} p-3 text-left text-white shadow-sm transition active:scale-[0.98]`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/18">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                      </svg>
                    </span>
                    <span className="flex-1 text-sm font-black">{item.label}</span>
                    {item.badge && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-rose-600">{item.badge}</span>}
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-6 rounded-3xl bg-white p-2 shadow-sm ring-1 ring-stone-100">
              <h3 className="px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">Navigation</h3>
              {navItems.map(([label, path]) => (
                <button
                  key={label}
                  onClick={() => go(path)}
                  className="flex min-h-12 w-full items-center justify-between rounded-2xl px-3 text-left text-sm font-bold text-stone-800 transition hover:bg-stone-50 active:scale-[0.99]"
                >
                  {label}
                  <span className="text-stone-300">›</span>
                </button>
              ))}
            </section>

            <section className="mt-4 rounded-3xl bg-white p-2 shadow-sm ring-1 ring-stone-100">
              <h3 className="px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">Support</h3>
              {supportItems.map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-12 items-center justify-between rounded-2xl px-3 text-sm font-bold text-stone-800 transition hover:bg-stone-50 active:scale-[0.99]"
                >
                  {label}
                  <span className="text-stone-300">›</span>
                </a>
              ))}
            </section>

            <section className="mt-4 rounded-3xl bg-white p-2 shadow-sm ring-1 ring-stone-100">
              <h3 className="px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">Account</h3>
              {user ? (
                <>
                  {[
                    ["Profile", "/profile"],
                    ["Settings", "/profile"],
                  ].map(([label, path]) => (
                    <button
                      key={label}
                      onClick={() => go(path)}
                      className="flex min-h-12 w-full items-center justify-between rounded-2xl px-3 text-left text-sm font-bold text-stone-800 transition hover:bg-stone-50 active:scale-[0.99]"
                    >
                      {label}
                      <span className="text-stone-300">›</span>
                    </button>
                  ))}
                </>
              ) : (
                <button
                  onClick={() => { setMobileMenuOpen(false); setSignInOpen(true); }}
                  className="flex min-h-12 w-full items-center justify-between rounded-2xl px-3 text-left text-sm font-bold text-indigo-600 transition hover:bg-indigo-50 active:scale-[0.99]"
                >
                  Sign In
                  <span>›</span>
                </button>
              )}
            </section>
          </div>

          {user && (
            <div className="border-t border-stone-200/70 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
              <button
                onClick={() => setLogoutConfirmOpen(true)}
                className="h-12 w-full rounded-2xl border border-rose-200 bg-rose-50 text-sm font-black text-rose-600 transition hover:bg-rose-100 active:scale-[0.98]"
              >
                Log out
              </button>
            </div>
          )}
        </aside>
      </div>

      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-stone-950/40 p-4 backdrop-blur-sm md:hidden">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-black text-stone-950">Log out?</h3>
            <p className="mt-2 text-sm leading-6 text-stone-500">You can sign back in anytime to access saved trips and wishlist items.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setLogoutConfirmOpen(false)}
                className="h-12 rounded-2xl border border-stone-200 text-sm font-bold text-stone-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="h-12 rounded-2xl bg-rose-600 text-sm font-black text-white"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {signInOpen && <SignInModal onClose={() => setSignInOpen(false)} />}

      {/* "Not Found" Message Toast */}
      {showReviewMsg && (
        <div className="fixed top-20 inset-x-4 md:inset-x-auto md:right-10 z-[100] max-w-sm bg-stone-900 text-white px-5 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <span className="text-xl">🚧</span>
              <div>
                <h4 className="font-bold text-sm mb-1">Destination Not Found</h4>
                <p className="text-xs text-stone-300 leading-relaxed">We are currently reviewing the destination and working to add <strong>{showReviewMsg}</strong> to our platform.</p>
              </div>
            </div>
            <button onClick={() => setShowReviewMsg("")} className="text-stone-400 hover:text-white">×</button>
          </div>
        </div>
      )}
    </>
  );
}
