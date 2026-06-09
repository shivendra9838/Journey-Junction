import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";

type Booking = {
  id: string;
  bookingReference: string;
  destinationName: string;
  checkInDate: string;
  checkOutDate: string;
  travelMode: string;
  totalAmount: number;
  paymentStatus: string;
  status: string;
  vehicle?: { name?: string; type?: string };
  pickupLocation?: { label?: string; address?: string };
};

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function daysUntil(dateValue: string) {
  const target = new Date(`${dateValue}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000));
}

export default function PaymentSuccessPage() {
  const [, navigate] = useLocation();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [seconds, setSeconds] = useState(8);
  const sessionId = useMemo(() => new URLSearchParams(window.location.search).get("session_id") ?? "", []);

  useEffect(() => {
    if (!sessionId) {
      setError("Stripe session id is missing.");
      setLoading(false);
      return;
    }
    apiFetch<{ booking: Booking }>("/bookings/transport/checkout/confirm", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    })
      .then(data => setBooking(data.booking))
      .catch(err => setError(err instanceof Error ? err.message : "Payment confirmation failed."))
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    if (!booking) return;
    const tick = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    const redirect = window.setTimeout(() => navigate("/"), 8000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(redirect);
    };
  }, [booking, navigate]);

  const daysLeft = booking ? daysUntil(booking.checkInDate) : 0;

  return (
    <div className="min-h-screen bg-[#f8f5f0] px-4 py-10 text-stone-800">
      <div className="mx-auto max-w-3xl rounded-3xl border border-stone-100 bg-white p-6 shadow-xl sm:p-10">
        {loading ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <p className="mt-4 text-sm font-semibold text-stone-500">Confirming your Stripe payment...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-500">Payment Issue</p>
            <h1 className="mt-3 text-3xl font-black text-stone-950">We could not confirm this payment.</h1>
            <p className="mt-3 text-sm text-stone-500">{error}</p>
            <button onClick={() => navigate("/dashboard")} className="mt-8 rounded-full bg-indigo-600 px-6 py-3 text-sm font-bold text-white">
              Open Dashboard
            </button>
          </div>
        ) : booking && (
          <>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">🎉</div>
              <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-emerald-600">Payment Successful</p>
              <h1 className="mt-3 text-3xl font-black leading-tight text-stone-950 sm:text-4xl">
                Congratulations! Please pack your bags and get ready for your trip.
              </h1>
              <p className="mt-3 text-lg font-bold text-indigo-700">
                {daysLeft === 0 ? "Your journey starts today." : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`}
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Detail label="Booking Reference" value={booking.bookingReference} />
              <Detail label="Destination" value={booking.destinationName} />
              <Detail label="Travel Dates" value={`${booking.checkInDate} to ${booking.checkOutDate}`} />
              <Detail label="Transport" value={`${booking.travelMode} - ${booking.vehicle?.name ?? "Vehicle"}`} />
              <Detail label="Pickup" value={booking.pickupLocation?.label || booking.pickupLocation?.address || "Selected pickup"} />
              <Detail label="Amount Paid" value={INR.format(booking.totalAmount)} />
              <Detail label="Payment Status" value={booking.paymentStatus.toUpperCase()} />
              <Detail label="Booking Status" value={booking.status} />
            </div>

            <div className="mt-8 flex flex-col items-center justify-between gap-3 rounded-2xl bg-indigo-50 px-5 py-4 text-center sm:flex-row sm:text-left">
              <p className="text-sm font-semibold text-indigo-800">
                Dashboard updated. Redirecting to Home in {seconds}s.
              </p>
              <button onClick={() => navigate("/dashboard")} className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white">
                View Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-stone-900">{value}</p>
    </div>
  );
}
