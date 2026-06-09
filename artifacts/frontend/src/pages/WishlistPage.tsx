import { useLocation } from "wouter";
import { useWishlist } from "@/context/WishlistContext";

function WandrLogo({ className = "" }: { className?: string }) {
  return (
    <img src="/logo.png" alt="Journey Junction" className={className} />
  );
}

function HeartIcon({ filled, className = "" }: { filled: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      fill={filled ? "currentColor" : "none"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
    </svg>
  );
}

function StarRow({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-3 h-3 ${i < n ? "fill-amber-400 text-amber-400" : "fill-stone-200 text-stone-200"}`} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

const CATEGORY_EMOJI: Record<string, string> = {
  Adventure: "🏄", Culture: "🎭", History: "🏛️", Nature: "🌿",
  Spiritual: "🙏", Scenic: "🌅", Wildlife: "🦁",
};

export default function WishlistPage() {
  const [, navigate] = useLocation();
  const { destinations, activities, hotels, totalCount, toggleDestination, toggleActivity, toggleHotel, clearAll } = useWishlist();

  const isEmpty = totalCount === 0;

  return (
    <div className="min-h-screen bg-[#f8f5f0] font-sans text-stone-800">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-10 py-4 bg-white/90 backdrop-blur-md border-b border-stone-100 shadow-sm">
        <button onClick={() => navigate("/")} className="cursor-pointer">
          <WandrLogo className="h-[32px] md:h-[36px] w-auto object-contain flex-shrink-0 scale-[1.5] md:scale-[1.8] origin-left" />
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back to Explore
          </button>
          {!isEmpty && (
            <button
              onClick={clearAll}
              className="text-xs font-semibold text-rose-500 hover:text-rose-700 transition-colors px-3 py-1.5 rounded-full border border-rose-200 hover:bg-rose-50"
            >
              Clear All
            </button>
          )}
        </div>
      </nav>

      <div className="pt-20 max-w-5xl mx-auto px-6 pb-20">

        {/* Page header */}
        <div className="py-10 flex items-end justify-between">
          <div>
            <div className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-2">Your Collection</div>
            <h1 className="text-4xl font-extrabold text-stone-900 leading-tight">My Wishlist</h1>
            <p className="text-stone-400 mt-1 text-sm">
              {isEmpty
                ? "Start saving your favourite destinations, stays, and experiences"
                : `${totalCount} saved item${totalCount !== 1 ? "s" : ""} — ${destinations.length} destination${destinations.length !== 1 ? "s" : ""}, ${activities.length} activit${activities.length !== 1 ? "ies" : "y"}, ${hotels.length} hotel${hotels.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-100 to-red-50 flex items-center justify-center shadow-sm">
            <HeartIcon filled={!isEmpty} className={`w-8 h-8 ${isEmpty ? "text-stone-300" : "text-rose-500"}`} />
          </div>
        </div>

        {/* Empty state */}
        {isEmpty && (
          <div className="text-center py-24 flex flex-col items-center gap-5">
            <div className="w-24 h-24 rounded-3xl bg-stone-100 flex items-center justify-center text-5xl">💫</div>
            <h2 className="text-2xl font-bold text-stone-700">Your wishlist is empty</h2>
            <p className="text-stone-400 max-w-sm leading-relaxed">
              Browse India's destinations and tap the heart icon to save places, activities, and hotels you love.
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-2 flex items-center gap-2 px-7 py-3.5 rounded-full bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              Explore Destinations
            </button>
          </div>
        )}

        {/* ── Saved Destinations ── */}
        {destinations.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <div className="text-xl">🗺️</div>
              <h2 className="text-xl font-extrabold text-stone-900">Destinations</h2>
              <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2.5 py-0.5 rounded-full">{destinations.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {destinations.map(dest => (
                <div
                  key={dest.id}
                  className="group rounded-2xl overflow-hidden bg-white border border-stone-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
                  onClick={() => navigate(`/destination/${dest.id}`)}
                >
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={dest.heroImage.replace("w=1600", "w=600").replace("q=90", "q=75")}
                      alt={dest.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={e => { e.stopPropagation(); toggleDestination(dest); }}
                        className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
                      >
                        <HeartIcon filled className="w-4 h-4 text-rose-400" />
                      </button>
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <div className="text-white text-lg font-extrabold leading-tight">{dest.name}</div>
                      <div className="text-white/70 text-[11px]">{dest.state}</div>
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <span className="text-xs text-stone-400 bg-stone-50 px-2.5 py-1 rounded-full border border-stone-100">{dest.region}</span>
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3 fill-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      <span className="text-xs font-bold text-stone-700">{dest.rating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Saved Activities ── */}
        {activities.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <div className="text-xl">🎯</div>
              <h2 className="text-xl font-extrabold text-stone-900">Activities</h2>
              <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2.5 py-0.5 rounded-full">{activities.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activities.map(act => (
                <div
                  key={`${act.destId}-${act.title}`}
                  className="group flex items-center gap-4 bg-white rounded-2xl border border-stone-100 shadow-sm p-4 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate(`/destination/${act.destId}#section-activities`)}
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                    <img src={act.image} alt={act.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm">{CATEGORY_EMOJI[act.category] ?? "🎯"}</span>
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{act.category}</span>
                    </div>
                    <div className="font-semibold text-stone-900 text-sm leading-tight truncate">{act.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-stone-400">{act.destName}</span>
                      <span className="text-stone-200">·</span>
                      <span className="text-[11px] text-stone-400">{act.duration}</span>
                      <span className="text-stone-200">·</span>
                      <span className="text-[11px] font-semibold text-indigo-600">{act.price}</span>
                    </div>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      toggleActivity(act.destId, act.destName, {
                        title: act.title, category: act.category,
                        duration: act.duration, price: act.price,
                        image: act.image, badge: null,
                      });
                    }}
                    className="w-8 h-8 rounded-full border border-rose-200 flex items-center justify-center hover:bg-rose-50 transition-colors shrink-0"
                  >
                    <HeartIcon filled className="w-4 h-4 text-rose-400" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Saved Hotels ── */}
        {hotels.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <div className="text-xl">🏨</div>
              <h2 className="text-xl font-extrabold text-stone-900">Hotels</h2>
              <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2.5 py-0.5 rounded-full">{hotels.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {hotels.map(hotel => (
                <div
                  key={`${hotel.destId}-${hotel.name}`}
                  className="group flex items-center gap-4 bg-white rounded-2xl border border-stone-100 shadow-sm p-4 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate(`/destination/${hotel.destId}#section-hotels`)}
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                    <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <StarRow n={hotel.stars} />
                    <div className="font-semibold text-stone-900 text-sm leading-tight truncate mt-0.5">{hotel.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-stone-400">{hotel.destName}</span>
                      <span className="text-stone-200">·</span>
                      <span className="text-[11px] font-semibold text-indigo-600">{hotel.price}</span>
                      <span className="text-[10px] text-stone-400">/ night</span>
                    </div>
                    <span className="inline-block mt-1 text-[10px] font-semibold text-stone-500 bg-stone-50 px-2 py-0.5 rounded-full border border-stone-100">
                      {hotel.tag}
                    </span>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      toggleHotel(hotel.destId, hotel.destName, {
                        name: hotel.name, stars: hotel.stars,
                        price: hotel.price, perNight: hotel.price,
                        image: hotel.image, tag: hotel.tag,
                      });
                    }}
                    className="w-8 h-8 rounded-full border border-rose-200 flex items-center justify-center hover:bg-rose-50 transition-colors shrink-0"
                  >
                    <HeartIcon filled className="w-4 h-4 text-rose-400" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Share prompt */}
        {!isEmpty && (
          <div className="bg-gradient-to-r from-indigo-600 to-sky-500 rounded-3xl p-8 text-center">
            <div className="text-3xl mb-3">✈️</div>
            <h3 className="text-xl font-extrabold text-white mb-2">Ready to turn dreams into plans?</h3>
            <p className="text-indigo-100 text-sm mb-5 max-w-sm mx-auto">Use our trip planner to build a day-by-day itinerary for any of your saved destinations.</p>
            <button
              onClick={() => navigate("/plan-trip")}
              className="px-7 py-3 rounded-full bg-white text-indigo-700 font-bold text-sm hover:shadow-xl transition-all hover:scale-105"
            >
              Plan My Trip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
