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

  // Tear the upstream MJPEG stream down the moment the browser goes away.
  // This is the whole point of the proxy getting this right: the Python
  // backend keeps a frame generator (and re-arms the C++ engine's per-frame
  // JPEG encode) alive for as long as ITS client — this proxy — stays
  // connected. If we leak the upstream fetch, the backend never sees the
  // disconnect and keeps burning CPU forever, and every open/close of the
  // debug view stacks another leaked stream.
  //
  // In the Pages Router dev server, `res` "close" alone has proven
  // unreliable for long-lived streams, so we bind the client-disconnect
  // signal on BOTH `req` and `res`, flip a flag the read loop checks, and —
  // critically — abort the fetch unconditionally in `finally` so the upstream
  // socket is destroyed no matter how the loop exits.
  let clientGone = false;
  const onClientGone = () => {
    clientGone = true;
    abortController.abort();
  };
  req.on("close", onClientGone);
  req.on("aborted", onClientGone);
  res.on("close", onClientGone);

  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

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

    reader = upstream.body.getReader();

    while (!clientGone && !res.destroyed && res.writable) {
      const { done, value } = await reader.read();
      if (done) break;
      if (clientGone || res.destroyed || !res.writable) break;

      // Respect backpressure: if the client (or the dev server's buffer)
      // can't keep up, wait for drain rather than piling frames into memory.
      // A disconnect during the wait resolves it immediately so we don't hang.
      const ok = res.write(Buffer.from(value));
      if (!ok) {
        await new Promise<void>((resolve) => {
          const done2 = () => {
            res.off("drain", done2);
            res.off("close", done2);
            resolve();
          };
          res.on("drain", done2);
          res.on("close", done2);
        });
      }
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
    req.off("close", onClientGone);
    req.off("aborted", onClientGone);
    res.off("close", onClientGone);

    // Force the upstream connection closed regardless of why we got here.
    // `reader.cancel()` releases the web stream; `abort()` destroys the
    // undici socket so it cannot linger in the connection pool.
    if (reader) {
      try {
        await reader.cancel();
      } catch {
        // already errored/aborted — nothing to release
      }
    }
    abortController.abort();

    if (!res.writableEnded && !res.destroyed) {
      res.end();
    }
  }
}
