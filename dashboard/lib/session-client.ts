import { clearToken, getToken } from './auth';

class SessionClient {
  private async request(method: string, path: string, body?: unknown): Promise<Response> {
    const token = getToken();
    const res = await fetch(`/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (res.status === 401) {
      clearToken();
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`${method} ${path} → ${res.status}${text ? ': ' + text : ''}`);
    }
    return res;
  }

  async get<T>(path: string): Promise<T> {
    const res = await this.request('GET', path);
    const body = (await res.json()) as { data: T };
    return body.data;
  }

  async post<T>(path: string, payload?: unknown): Promise<T> {
    const res = await this.request('POST', path, payload);
    const body = (await res.json()) as { data: T };
    return body.data;
  }

  async delete(path: string): Promise<void> {
    await this.request('DELETE', path);
  }
}

export function createSessionClient() {
  return new SessionClient();
}
