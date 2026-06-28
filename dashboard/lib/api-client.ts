export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
    const body = await res.json();
    return body.data as T;
  }

  async post<T>(path: string, payload: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
    const body = await res.json();
    return body.data as T;
  }
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return new ApiClient(
    url.endsWith('/') ? url.slice(0, -1) : url,
    process.env.NEXT_PUBLIC_API_KEY ?? '',
  );
}
