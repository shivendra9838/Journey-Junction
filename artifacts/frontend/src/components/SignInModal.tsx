import { useState } from "react";
import { useUser, ApiError } from "@/context/UserContext";
import { GoogleLogin } from "@react-oauth/google";

interface Props { onClose: () => void; }

export default function SignInModal({ onClose }: Props) {
  const { signIn, register, signInWithGoogle } = useUser();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (tab === "signup") {
        await register(name.trim() || email.split("@")[0], email, password);
      } else {
        await signIn(email, password);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleTabChange(t: "signin" | "signup") {
    setTab(t);
    setError(null);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden z-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 transition-colors text-lg"
        >×</button>

        <div className="px-8 pt-8 pb-8">
          {done ? (
            <div className="text-center py-6 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-4xl">✓</div>
              <h2 className="text-2xl font-extrabold text-stone-900">
                {tab === "signin" ? "Welcome back!" : "Account created!"}
              </h2>
              <p className="text-stone-400 text-sm">You're signed in to Journey Junction. Let's plan your next adventure.</p>
              <button
                onClick={onClose}
                className="mt-2 px-8 py-3 rounded-full bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors shadow-md"
              >
                Continue Exploring
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  <img src="/logo.png" alt="Journey Junction" className="h-[42px] w-auto object-contain scale-[1.5] origin-center" />
                </div>
                <h2 className="text-2xl font-extrabold text-stone-900">
                  {tab === "signin" ? "Welcome back" : "Join Journey Junction"}
                </h2>
                <p className="text-stone-400 text-sm mt-1">
                  {tab === "signin" ? "Sign in to access your wishlist & trips" : "Create your free account to start exploring"}
                </p>
              </div>

              <div className="flex bg-stone-100 rounded-xl p-1 mb-6">
                {(["signin", "signup"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => handleTabChange(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
                  >{t === "signin" ? "Sign In" : "Get Started"}</button>
                ))}
              </div>

              <div className="w-full flex justify-center mb-4">
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    setError(null);
                    setLoading(true);
                    try {
                      if (credentialResponse.credential) {
                        await signInWithGoogle(credentialResponse.credential);
                        setDone(true);
                      } else {
                        setError("Google did not return a sign-in credential. Please try again.");
                      }
                    } catch (err) {
                      setError(err instanceof ApiError ? err.message : "Google sign-in failed.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  onError={() => {
                    setError("Google sign-in was unsuccessful.");
                  }}
                  theme="outline"
                  size="large"
                  text="continue_with"
                  shape="rectangular"
                />
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="text-xs text-stone-400 font-medium">or</span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                {tab === "signup" && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Full Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                      className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                      className="w-full border border-stone-200 rounded-xl px-4 py-3 pr-11 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all" />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors">
                      {showPass
                        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      }
                    </button>
                  </div>
                </div>

                {tab === "signin" && (
                  <div className="flex items-center justify-end pt-1">
                    <button type="button" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                      Forgot password?
                    </button>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full mt-2 py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-70 transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      {tab === "signin" ? "Signing in…" : "Creating account…"}
                    </>
                  ) : (tab === "signin" ? "Sign In" : "Create Account")}
                </button>
              </form>

              <p className="text-center text-xs text-stone-400 mt-5">
                {tab === "signin" ? "Don't have an account? " : "Already have an account? "}
                <button onClick={() => handleTabChange(tab === "signin" ? "signup" : "signin")}
                  className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                  {tab === "signin" ? "Get started free" : "Sign in"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
