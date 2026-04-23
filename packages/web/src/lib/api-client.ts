const BASE = "/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: { error: string },
  ) {
    super(body.error);
    this.name = "ApiError";
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, json);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

/** Fetch all pages from a cursor-paginated endpoint. */
export async function fetchAllPages<T>(
  path: string,
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | null = null;

  for (;;) {
    const reqUrl: string = cursor ? `${path}${path.includes("?") ? "&" : "?"}cursor=${cursor}` : path;
    const res: { data: T[]; next_cursor: string | null } = await api.get(reqUrl);
    all.push(...res.data);
    if (!res.next_cursor) break;
    cursor = res.next_cursor;
  }

  return all;
}
