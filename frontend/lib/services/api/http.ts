/**
 * Thin fetch wrapper for the live backend.
 *
 * - Base URL from NEXT_PUBLIC_API_BASE_URL (default http://localhost:8000/api/v1).
 * - Attaches the bearer token read from the persisted auth session.
 * - The backend returns FLAT JSON (no { data } envelope), so we return parsed
 *   JSON directly and surface errors from `detail` / `error.message`.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

const SESSION_KEY = "greenmiles.session";

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as { accessToken?: string }).accessToken ?? null;
  } catch {
    return null;
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Query params; undefined/null values are skipped. */
  query?: Record<string, string | number | undefined | null>;
  /** Skip attaching the auth token (e.g. login). */
  auth?: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, query, auth = true } = options;

  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = readToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const detail = json?.detail;
    const message =
      json?.error?.message ??
      (detail && typeof detail === "object" ? detail.message : detail) ??
      json?.message ??
      `Request failed (${res.status})`;
    throw new ApiError(
      typeof message === "string" ? message : JSON.stringify(message),
      res.status,
    );
  }

  return json as T;
}
