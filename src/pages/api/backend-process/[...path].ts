import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_PROCESS_ORIGIN =
  process.env.BACKEND_PROCESS_ORIGIN ??
  process.env.BACKEND_ORIGIN ??
  "http://192.168.103.97:8009";

const FORWARDED_HEADERS = ["content-type", "accept", "authorization"];

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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
  const upstreamPath = (req.url ?? "").replace(
    /^\/api\/backend-process\/?/,
    ""
  );
  const targetUrl = `${BACKEND_PROCESS_ORIGIN}/${upstreamPath}`;

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
      body: METHODS_WITH_BODY.has(method)
        ? ((await readRawBody(req)) as unknown as BodyInit)
        : undefined,
    });

    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);

    const body = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status).send(body);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[backend-process-proxy] ${method} ${targetUrl} failed: ${detail}`
    );
    res.status(502).json({ error: "Bad Gateway", detail });
  }
}
