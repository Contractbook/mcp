export interface Route {
  method: string;
  path: string | RegExp;
  status?: number;
  contentType?: string;
  response?: unknown;
  body?: string;
  hang?: boolean;
}

export interface CapturedRequest {
  method: string;
  url: URL;
  headers: Record<string, string>;
  body: BodyInit | null | undefined;
  signal: AbortSignal | null | undefined;
}

export interface FakeFetchOptions {
  anyOrder?: boolean;
}

function matches(route: Route, method: string, url: URL): boolean {
  const pathMatch =
    typeof route.path === "string" ? url.pathname === route.path : route.path.test(url.pathname);
  return route.method === method && pathMatch;
}

export function fakeFetch(
  routes: Route[],
  options: FakeFetchOptions = {},
): {
  fetchImpl: typeof fetch;
  requests: CapturedRequest[];
  unused: Route[];
} {
  const requests: CapturedRequest[] = [];
  const unused = [...routes];

  const fetchImpl = async (url: URL, init: RequestInit & { method: string }): Promise<Response> => {
    const { method } = init;

    if (unused.length === 0) {
      throw new Error(
        `Unexpected call #${requests.length + 1}: ${method} ${url.pathname} (only ${routes.length} route(s) expected)`,
      );
    }

    const routeIndex = options.anyOrder
      ? unused.findIndex((candidate) => matches(candidate, method, url))
      : matches(unused[0], method, url)
        ? 0
        : -1;

    if (routeIndex === -1) {
      const expected = options.anyOrder
        ? unused.map((candidate) => `${candidate.method} ${candidate.path}`).join(" or ")
        : `${unused[0].method} ${unused[0].path}`;
      throw new Error(
        `Call #${requests.length + 1}: expected ${expected}, got ${method} ${url.pathname}`,
      );
    }

    const [route] = unused.splice(routeIndex, 1);

    requests.push({
      method,
      url,
      headers: (init.headers ?? {}) as Record<string, string>,
      body: init.body,
      signal: init.signal,
    });

    if (route.hang) {
      const { signal } = init;
      return new Promise<Response>((_resolve, reject) => {
        if (signal?.aborted) {
          reject(signal.reason);
          return;
        }
        signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    }

    const contentType = route.contentType ?? "application/json";
    const body =
      route.body ??
      (contentType.includes("application/json")
        ? JSON.stringify(route.response)
        : (route.response as string));

    return new Response(body, {
      status: route.status ?? 200,
      headers: { "content-type": contentType },
    });
  };

  return { fetchImpl: fetchImpl as typeof fetch, requests, unused };
}
