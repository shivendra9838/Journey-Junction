import { useLocation } from "wouter";
import { travelPackages } from "@/data/premiumTravel";

import Navbar from "@/components/Navbar";

export default function PackagesPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-10">
        <section className="relative overflow-hidden rounded-[2rem] bg-stone-950 px-6 py-16 text-white sm:px-10">
          <img src="/images/unsplash-67cfe84b31d8.png" alt="India travel packages" className="absolute inset-0 h-full w-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
          <div className="relative max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-200">Trending Packages</p>
            <h1 className="mt-3 text-4xl font-black sm:text-6xl">Curated India holidays ready to book</h1>
            <p className="mt-4 text-sm leading-7 text-white/75">
              Handpicked itineraries inspired by MakeMyTrip, WanderOn and premium local travel planning. Prices are shown in Indian Rupees.
            </p>
          </div>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {travelPackages.map((pkg) => (
            <article key={pkg.id} className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="relative h-56">
                <img src={pkg.coverImage} alt={pkg.title} className="h-full w-full object-cover" />
                <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-indigo-700">{pkg.duration}</div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-stone-950">{pkg.title}</h2>
                    <p className="text-xs font-semibold text-stone-400">{pkg.destination}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">{pkg.rating}</span>
                </div>
                <p className="mt-4 text-lg font-black text-stone-950">{pkg.price}</p>
                <div className="mt-4 space-y-2">
                  {pkg.highlights.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-stone-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {item}
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate("/plan-trip")} className="mt-5 w-full rounded-full bg-indigo-600 py-3 text-sm font-black text-white transition hover:bg-indigo-700">
                  Build itinerary
                </button>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
