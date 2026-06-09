import { useEffect } from "react";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";

export default function PaymentCancelPage() {
  const [, navigate] = useLocation();
  const sessionId = new URLSearchParams(window.location.search).get("session_id") ?? "";

  useEffect(() => {
    if (!sessionId) return;
    apiFetch("/bookings/transport/checkout/cancel", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});
  }, [sessionId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f5f0] px-4 text-stone-800">
      <div className="w-full max-w-xl rounded-3xl border border-stone-100 bg-white p-8 text-center shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-600">Payment Cancelled</p>
        <h1 className="mt-3 text-3xl font-black text-stone-950">Your booking was not created.</h1>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          Stripe Checkout was cancelled or failed before payment. No trip booking has been saved.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={() => navigate("/")} className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-bold text-white">
            Back Home
          </button>
          <button onClick={() => navigate("/dashboard")} className="rounded-full border border-stone-200 px-6 py-3 text-sm font-bold text-stone-700">
            Open Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
