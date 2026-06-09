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
  const { user } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 md:px-10 py-3 md:py-4 bg-white/80 backdrop-blur-md border-b border-stone-100">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="cursor-pointer shrink-0">
            <WandrLogo className="h-[32px] md:h-[36px] w-auto object-contain flex-shrink-0 scale-[1.5] md:scale-[1.8] origin-left" />
          </button>
        </div>

        {/* Global Search */}
        <div className="flex-1 max-w-md mx-3 md:mx-6 relative" ref={searchRef}>
          <div className="relative group">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              placeholder="Search any destination..."
              className="w-full pl-10 pr-4 py-2 rounded-full bg-stone-100 border-transparent focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-stone-800 transition-all outline-none"
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

        <div className="flex items-center gap-2">
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
            className="md:hidden flex items-center justify-center p-2 text-stone-600"
            onClick={() => setMobileMenuOpen(true)}
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

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white px-5 py-6 md:hidden">
          <div className="flex items-center justify-between">
             <WandrLogo className="h-[32px] md:h-[36px] w-auto object-contain flex-shrink-0 scale-[1.5] md:scale-[1.8] origin-left" />
             <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-stone-600">
               <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
               </svg>
             </button>
          </div>


          <div className="mt-6 flex flex-col gap-6">
             <button
               onClick={() => { setMobileMenuOpen(false); navigate("/plan-trip"); }}
               className="text-left text-2xl font-black text-stone-900"
             >
               Plan My Trip
             </button>
             <button
               onClick={() => { setMobileMenuOpen(false); navigate("/wishlist"); }}
               className="flex items-center gap-2 text-left text-2xl font-black text-stone-900"
             >
               Wishlist
               {totalCount > 0 && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs text-white">{totalCount}</span>}
             </button>
             <div className="mt-4 border-t border-stone-100 pt-6 flex flex-col gap-6">
               {user ? (
                 <>
                   <button
                     onClick={() => { setMobileMenuOpen(false); navigate("/dashboard"); }}
                     className="text-left text-2xl font-black text-stone-900"
                   >
                     Dashboard
                   </button>
                   <button
                     onClick={() => { setMobileMenuOpen(false); signOut(); }}
                     className="text-left text-2xl font-black text-rose-600"
                   >
                     Sign Out
                   </button>
                   <div className="mt-4 flex items-center gap-3">
                     <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                       {user.name.charAt(0).toUpperCase()}
                     </div>
                     <div className="text-sm">
                       <p className="font-bold text-stone-900">{user.name}</p>
                       <p className="text-stone-500">{user.email}</p>
                     </div>
                   </div>
                 </>
               ) : (
                 <button
                   onClick={() => { setMobileMenuOpen(false); setSignInOpen(true); }}
                   className="text-left text-2xl font-black text-indigo-600"
                 >
                   Sign In
                 </button>
               )}
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
