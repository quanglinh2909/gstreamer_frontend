import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_ORIGIN =
  process.env.BACKEND_ORIGIN ?? "http://192.168.103.97:8009";

const FORWARDED_HEADERS = ["accept", "authorization"];

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const cameraId = getParam(req.query.cameraId)?.trim();
  const jobId = getParam(req.query.jobId)?.trim();

  if (!cameraId || !jobId) {
    res.status(400).json({ error: "Missing cameraId or jobId" });
    return;
  }

  const targetUrl =
    `${BACKEND_ORIGIN}/ai-debug/cameras/${encodeURIComponent(cameraId)}` +
    `/jobs/${encodeURIComponent(jobId)}/mjpeg`;
  const headers = new Headers();

  for (const name of FORWARDED_HEADERS) {
    const value = req.headers[name];
    if (typeof value === "string") headers.set(name, value);
  }

  const abortController = new AbortController();
  const abortUpstream = () => abortController.abort();

  res.on("close", abortUpstream);

  try {
    const upstream = await fetch(targetUrl, {
      method: "GET",
      headers,
      signal: abortController.signal,
    });

    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);

    res.statusCode = upstream.status;

    if (!upstream.body) {
      return;
    }

    res.flushHeaders();

    const reader = upstream.body.getReader();

    while (!res.destroyed) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      res.write(Buffer.from(value));
    }
  } catch (error) {
    if (!abortController.signal.aborted) {
      const detail = error instanceof Error ? error.message : "Unknown error";

      console.error(`[ai-debug-proxy] GET ${targetUrl} failed: ${detail}`);

      if (!res.headersSent) {
        res.status(502).json({ error: "Bad Gateway", detail });
      }
    }
  } finally {
    res.off("close", abortUpstream);

    if (!res.writableEnded && !res.destroyed) {
      res.end();
    }
  }
}
