import { useLocation } from "wouter";
import { blogPosts } from "@/data/premiumTravel";
import Navbar from "@/components/Navbar";

export default function BlogsPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#f8f5f0] text-stone-800">
      <Navbar />

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-10">
        <section className="mb-10 max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-500">Travel Journal</p>
          <h1 className="mt-3 text-4xl font-black text-stone-950 sm:text-6xl">Guides for smarter India travel</h1>
          <p className="mt-4 text-sm leading-7 text-stone-500">
            Editorial style cards for destination inspiration, season guides, route planning and practical travel tips.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {blogPosts.map((post) => (
            <article key={post.id} className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <img src={post.image} alt={post.title} className="h-56 w-full object-cover" />
              <div className="p-5">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-indigo-500">
                  <span>{post.category}</span>
                  <span className="h-1 w-1 rounded-full bg-stone-300" />
                  <span>{post.readTime}</span>
                </div>
                <h2 className="text-xl font-black leading-tight text-stone-950">{post.title}</h2>
                <p className="mt-3 text-sm leading-6 text-stone-500">{post.excerpt}</p>
                <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
                  <span className="text-xs font-bold text-stone-400">{post.author}</span>
                  <span className="text-xs font-black text-indigo-600">Read guide</span>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
