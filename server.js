import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || "0.0.0.0";
const indexPath = path.join(__dirname, "index.html");

function sendJson(req, res, statusCode, payload) {
  const body = JSON.stringify(payload);

  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });

  res.end(req.method === "HEAD" ? undefined : body);
}

function sendIndex(req, res) {
  const { size, mtime } = statSync(indexPath);

  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": size,
    "Last-Modified": mtime.toUTCString(),
    "Cache-Control": "public, max-age=0, must-revalidate",
  });

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  createReadStream(indexPath).pipe(res);
}

const server = createServer((req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = requestUrl.pathname;

  if (pathname === "/health" || pathname === "/api/health") {
    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(req, res, 405, {
        success: false,
        error: "Method not allowed",
      });
      return;
    }

    sendJson(req, res, 200, {
      success: true,
      data: {
        status: "ok",
        service: "solecraft",
        frontend: "static-html",
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(req, res, 405, {
      success: false,
      error: "Method not allowed",
    });
    return;
  }

  try {
    sendIndex(req, res);
  } catch (error) {
    sendJson(req, res, 500, {
      success: false,
      error: "Unable to serve SoleCraft page",
    });
  }
});

server.listen(port, host, () => {
  console.log(`SoleCraft static server listening on http://${host}:${port}`);
});
