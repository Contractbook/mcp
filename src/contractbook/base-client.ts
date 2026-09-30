export interface HttpClientConfig {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export interface RequestConfig {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: BodyInit;
  params?: Record<string, string | string[]>;
  signal?: AbortSignal;
}

export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
}

const MAX_ERROR_BODY_LENGTH = 500;

function truncate(text: string): string {
  return text.length > MAX_ERROR_BODY_LENGTH ? `${text.slice(0, MAX_ERROR_BODY_LENGTH)}…` : text;
}

export class HttpError extends Error {
  public readonly status: number;
  public readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`HTTP ${status}: ${truncate(typeof body === "string" ? body : JSON.stringify(body))}`);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

export class HttpClient {
  readonly baseUrl: string;
  protected readonly headers: Record<string, string>;
  private readonly fetchImpl: typeof fetch;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl;
    this.headers = {
      authorization: `Bearer ${config.apiKey}`,
    };
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async request<T>(config: RequestConfig): Promise<HttpResponse<T>> {
    const url = new URL(config.url, `${this.baseUrl}/`);
    for (const [key, value] of Object.entries(config.params ?? {})) {
      for (const item of Array.isArray(value) ? value : [value]) {
        url.searchParams.append(key, item);
      }
    }

    const headers: Record<string, string> = {
      ...this.headers,
      ...config.headers,
    };

    const response = await this.fetchImpl(url, {
      method: config.method,
      headers,
      body: config.body,
      signal: config.signal
        ? AbortSignal.any([config.signal, AbortSignal.timeout(30_000)])
        : AbortSignal.timeout(30_000),
    });

    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.text();
    let data: unknown = text;
    if (contentType.includes("application/json")) {
      try {
        data = JSON.parse(text);
      } catch (error) {
        // An error response with a malformed body should still surface its HTTP status.
        if (response.ok) {
          throw error;
        }
      }
    }

    if (!response.ok) {
      throw new HttpError(response.status, data);
    }

    return { status: response.status, data: data as T };
  }
}
