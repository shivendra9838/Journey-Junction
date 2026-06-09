import { AppError } from "../shared/errors";

type StripePaymentIntent = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret?: string;
  latest_charge?: string;
  metadata?: Record<string, string>;
};

type StripeCheckoutSession = {
  id: string;
  url?: string;
  amount_total?: number;
  currency?: string;
  customer_email?: string;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  status: "open" | "complete" | "expired";
  payment_intent?: string;
  metadata?: Record<string, string>;
};

const stripeAuthHeader = () => {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new AppError(500, "STRIPE_SECRET_KEY is not configured", "STRIPE_CONFIG_MISSING");
  return `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
};

const stripeRequest = async <T>(path: string, init: RequestInit = {}) => {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: stripeAuthHeader(),
      ...(init.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...init.headers,
    },
  });
  const json = await res.json() as T & { error?: { message?: string } };
  if (!res.ok) throw new AppError(502, json.error?.message ?? "Stripe request failed", "STRIPE_FAILED");
  return json as T;
};

const paise = (amount: number) => Math.round(amount * 100);

export async function createStripePaymentIntent(input: {
  amount: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const body = new URLSearchParams({
    amount: String(paise(input.amount)),
    currency: (input.currency ?? "INR").toLowerCase(),
    description: input.receipt,
    "metadata[receipt]": input.receipt,
  });

  for (const [key, value] of Object.entries(input.notes ?? {})) {
    body.set(`metadata[${key}]`, value);
  }

  return stripeRequest<StripePaymentIntent>("/payment_intents", { method: "POST", body });
}

export async function verifyStripePaymentIntent(paymentIntentId: string) {
  const paymentIntent = await stripeRequest<StripePaymentIntent>(`/payment_intents/${encodeURIComponent(paymentIntentId)}`);
  return {
    paymentIntent,
    isPaid: paymentIntent.status === "succeeded",
  };
}

export async function refundStripePaymentIntent(paymentIntentId: string, amount: number) {
  const body = new URLSearchParams({
    payment_intent: paymentIntentId,
    amount: String(paise(amount)),
  });
  return stripeRequest<{ id: string; status: string; amount: number }>("/refunds", { method: "POST", body });
}

export async function createStripeCheckoutSession(input: {
  amount: number;
  currency?: string;
  name: string;
  description: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  clientReferenceId: string;
  metadata?: Record<string, string>;
}) {
  const body = new URLSearchParams({
    mode: "payment",
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.clientReferenceId,
    customer_email: input.customerEmail,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": (input.currency ?? "inr").toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(paise(input.amount)),
    "line_items[0][price_data][product_data][name]": input.name,
    "line_items[0][price_data][product_data][description]": input.description,
  });

  for (const [key, value] of Object.entries(input.metadata ?? {})) {
    body.set(`metadata[${key}]`, value);
    body.set(`payment_intent_data[metadata][${key}]`, value);
  }

  return stripeRequest<StripeCheckoutSession>("/checkout/sessions", { method: "POST", body });
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  return stripeRequest<StripeCheckoutSession>(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
}
