import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const server = path.join(dist, "server");
const hostingDir = path.join(dist, ".openai");

fs.copyFileSync(path.join(server, "index.mjs"), path.join(server, "index.js"));
fs.mkdirSync(hostingDir, { recursive: true });
fs.copyFileSync(path.join(root, ".openai", "hosting.json"), path.join(hostingDir, "hosting.json"));

console.log("Prepared Sites-compatible vinext output.");
