const { spawn } = require("node:child_process");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const node = "C:\\Users\\kerims\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe";
const cli = path.join(root, "node_modules", "vinext", "dist", "cli.js");
const url = "http://127.0.0.1:4173";
const output = "C:\\Users\\kerims\\.codex\\visualizations\\2026\\07\\21\\019f86a8-e8f8-7a12-9bda-fcf145a7e02b\\global-cup-draft-home.png";
const resultOutput = "C:\\Users\\kerims\\.codex\\visualizations\\2026\\07\\21\\019f86a8-e8f8-7a12-9bda-fcf145a7e02b\\global-cup-draft-result.png";

const server = spawn(node, [cli, "dev", "--hostname", "127.0.0.1", "--port", "4173"], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
});

server.stdout.on("data", (chunk) => process.stdout.write(chunk));
server.stderr.on("data", (chunk) => process.stderr.write(chunk));

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Dev server did not become ready.");
}

(async () => {
  let browser;
  try {
    await waitForServer();
    browser = await chromium.launch({
      headless: true,
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    });
    const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1 });
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.screenshot({ path: output, fullPage: true });
    await page.getByRole("button", { name: /Собрать автоматически/i }).click();
    await page.waitForTimeout(400);
    const playerCount = await page.locator(".pitch-slot.filled").count();
    const coachText = await page.locator(".coach-copy strong").innerText();
    const budgetText = await page.locator(".budget-card > strong").innerText();
    await page.getByRole("button", { name: /Оценить команду/i }).click();
    await page.waitForTimeout(200);
    const resultScore = await page.locator(".result-score span").innerText();
    await page.screenshot({ path: resultOutput, fullPage: false });
    console.log(JSON.stringify({ title: await page.title(), playerCount, coachText, budgetText, resultScore, consoleErrors, screenshots: [output, resultOutput] }, null, 2));
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch((error) => {
  console.error(error);
  server.kill();
  process.exitCode = 1;
});
