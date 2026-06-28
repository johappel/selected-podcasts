import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.resolve(scriptDir, "..", "docs");
const port = Number.parseInt(process.env.PORT || "4173", 10);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".ico", "image/x-icon"],
]);

function resolveRequestPath(urlPath) {
  const requestedPath = decodeURIComponent(urlPath || "/");
  const normalized = requestedPath === "/" ? "/index.html" : requestedPath;
  const targetPath = path.normalize(path.join(docsDir, normalized));

  if (!targetPath.startsWith(docsDir)) {
    return null;
  }

  return targetPath;
}

const server = http.createServer(async (request, response) => {
  const targetPath = resolveRequestPath(new URL(request.url || "/", `http://localhost:${port}`).pathname);

  if (!targetPath) {
    response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  try {
    const content = await readFile(targetPath);
    const extension = path.extname(targetPath).toLowerCase();
    response.writeHead(200, {
      "content-type": mimeTypes.get(extension) || "application/octet-stream",
      "cache-control": "no-store",
    });
    response.end(content);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`Serving ${docsDir} at http://localhost:${port}`);
});
