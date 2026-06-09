import { useLocation } from "wouter";
import { comparisonRows } from "@/data/premiumTravel";
import Navbar from "@/components/Navbar";

export default function ComparePage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#f8f5f0] text-stone-800">
      <Navbar />

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-10">
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-500">Destination Comparison</p>
            <h1 className="mt-3 text-4xl font-black text-stone-950 sm:text-6xl">Goa vs Kerala</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-stone-500">
              Compare budget, weather, nightlife, family comfort, beaches, food and adventure so travellers can pick the right trip faster.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <img src="/images/unsplash-be41aa2e4372.jpg" alt="Goa" className="h-64 rounded-2xl object-cover shadow-sm" />
            <img src="/images/unsplash-7916115aeef0.jpg" alt="Kerala" className="h-64 rounded-2xl object-cover shadow-sm" />
          </div>
        </section>

        <section className="mt-10 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <div className="min-w-[500px]">
              <div className="grid grid-cols-3 bg-stone-950 px-5 py-4 text-sm font-black text-white">
                <div>Factor</div>
                <div>Goa</div>
                <div>Kerala</div>
              </div>
              {comparisonRows.map((row, index) => (
                <div key={row.label} className={`grid grid-cols-3 px-5 py-4 text-sm ${index % 2 ? "bg-stone-50" : "bg-white"}`}>
                  <div className="font-black text-stone-900 pr-2">{row.label}</div>
                  <div className="text-stone-600 pr-2">{row.goa}</div>
                  <div className="text-stone-600">{row.kerala}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
