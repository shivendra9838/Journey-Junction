export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiError(res.status, "Invalid server response");
  }

  if (!res.ok) {
    const payload = data as { error?: string; details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } };
    const fieldErrors = payload.details?.fieldErrors
      ? Object.entries(payload.details.fieldErrors)
          .flatMap(([field, errors]) => errors.map(error => `${field}: ${error}`))
      : [];
    const formErrors = payload.details?.formErrors ?? [];
    const detailText = [...fieldErrors, ...formErrors].filter(Boolean).join("; ");
    const msg = detailText || payload.error || `Request failed (${res.status})`;
    throw new ApiError(res.status, msg);
  }

  return data as T;
}
