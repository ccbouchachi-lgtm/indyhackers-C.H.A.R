/** Real same-origin API requests. Sessions are managed by backend HttpOnly cookies. */
export type SignedInProfile = {
  id: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export class WebApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "WebApiError";
  }
}

export async function requestApi<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new WebApiError(0, "NETWORK_ERROR", "Unable to reach GroupLock. Check your connection and try again.");
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new WebApiError(response.status, payload?.error?.code ?? "REQUEST_FAILED", payload?.error?.message ?? "Request failed. Please try again.");
  }
  if (!payload || typeof payload !== "object" || !("data" in payload)) throw new WebApiError(response.status, "INVALID_RESPONSE", "The server returned an unexpected response.");
  return payload.data as T;
}

export const webApi = {
  login: (email: string, password: string) => requestApi<SignedInProfile>("/api/auth/login", "POST", { email: email.trim(), password }),
  me: () => requestApi<SignedInProfile>("/api/auth/me"),
  logout: () => requestApi<null>("/api/auth/logout", "POST"),
  pair: () => requestApi<{ connection: { id: string; revokedAt: string | null }; credential: string }>("/api/extension/pair", "POST"),
};
