import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Backend proxy.
 *
 * The oatpp backend resets the TCP connection (RST, surfaced as ECONNRESET)
 * whenever total request headers exceed ~4KB. A browser request carries far
 * more than the backend needs — Cookie (localhost cookies, via axios
 * `withCredentials`), User-Agent, Sec-* and Accept-* headers — and Next.js
 * adds X-Forwarded-* on top, which together cross that limit.
 *
 * This route forwards requests upstream with only an allow-list of headers,
 * keeping every request comfortably under the limit.
 */
const BACKEND_ORIGIN =
  process.env.BACKEND_ORIGIN ?? "http://192.168.103.97:8009";

// Request headers forwarded upstream. Everything else (cookie, sec-*,
// user-agent, referer, x-forwarded-*, accept-encoding, ...) is dropped.
const FORWARDED_HEADERS = ["content-type", "accept", "authorization"];

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Consume the raw body ourselves so it can be forwarded upstream untouched.
export const config = {
  api: { bodyParser: false },
};

async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // req.url is "/api/backend/<path>?<query>"; forward "<path>?<query>" as-is.
  const upstreamPath = (req.url ?? "").replace(/^\/api\/backend\/?/, "");
  const targetUrl = `${BACKEND_ORIGIN}/${upstreamPath}`;

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = req.headers[name];
    if (typeof value === "string") headers.set(name, value);
  }

  const method = (req.method ?? "GET").toUpperCase();

  try {
    const upstream = await fetch(targetUrl, {
      method,
      headers,
      // A Buffer is a valid fetch body at runtime; the cast bridges Node's
      // Buffer type and the DOM `BodyInit` type, which TS treats as disjoint.
      body: METHODS_WITH_BODY.has(method)
        ? ((await readRawBody(req)) as unknown as BodyInit)
        : undefined,
    });

    // Pass through content-type only. Body is already decoded by fetch, so
    // copying content-encoding/content-length would corrupt the response.
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);

    const body = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status).send(body);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    console.error(`[backend-proxy] ${method} ${targetUrl} failed: ${detail}`);
    res.status(502).json({ error: "Bad Gateway", detail });
  }
}
