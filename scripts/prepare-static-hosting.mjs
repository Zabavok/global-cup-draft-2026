import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const spa = path.join(root, "dist-spa");
const dist = path.join(root, "dist");
const server = path.join(dist, "server");
const hostingDir = path.join(dist, ".openai");

let html = fs.readFileSync(path.join(spa, "index.html"), "utf8");
const stylesheet = html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/);
const moduleScript = html.match(/<script[^>]+src="([^"]+\.js)"[^>]*><\/script>/);

if (!stylesheet || !moduleScript) {
  throw new Error("Vite output does not contain the expected CSS and JavaScript assets.");
}

const css = fs
  .readFileSync(path.join(spa, stylesheet[1].replace(/^\//, "")), "utf8")
  .replace(/<\/style/gi, "<\\/style");
const javascript = fs
  .readFileSync(path.join(spa, moduleScript[1].replace(/^\//, "")), "utf8")
  .replace(/<\/script/gi, "<\\/script");
const icon = fs.readFileSync(path.join(root, "app", "icon.svg"), "utf8");

html = html
  .replace(stylesheet[0], () => `<style>${css}</style>`)
  .replace(moduleScript[0], () => `<script type="module">${javascript}</script>`)
  .replace("</head>", '<link rel="icon" href="/favicon.svg" type="image/svg+xml" /></head>');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(server, { recursive: true });
fs.mkdirSync(hostingDir, { recursive: true });

const worker = `const HTML=${JSON.stringify(html)};
const ICON=${JSON.stringify(icon)};
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    if (url.pathname === "/favicon.svg" || url.pathname === "/favicon.ico") {
      return new Response(request.method === "HEAD" ? null : ICON, {
        headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "public, max-age=86400" },
      });
    }
    return new Response(request.method === "HEAD" ? null : HTML, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=0, must-revalidate",
        "x-content-type-options": "nosniff",
      },
    });
  },
};
`;

fs.writeFileSync(path.join(server, "index.js"), worker, "utf8");
fs.copyFileSync(path.join(root, ".openai", "hosting.json"), path.join(hostingDir, "hosting.json"));

console.log(`Prepared self-contained Sites worker (${Math.round(Buffer.byteLength(worker) / 1024)} KiB).`);
