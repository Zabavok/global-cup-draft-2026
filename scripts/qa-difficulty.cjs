const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => {
    errors.push(`page: ${error.message}`);
    console.error(`pageerror: ${error.message}`);
  });

  const modes = [
    { button: /Лёгкая/, budget: 200 },
    { button: /Обычная/, budget: 120 },
    { button: /Сложная/, budget: 85 },
  ];
  const results = [];

  for (const mode of modes) {
    console.log(`checking ${mode.budget}`);
    await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: mode.button }).click();
    await page.getByRole("button", { name: /Аргентина/ }).click();
    await page.getByRole("button", { name: /Собрать автоматически/ }).click();
    await page.waitForTimeout(150);
    console.log(`screen ${mode.budget}: ${await page.locator("main").getAttribute("class")}`);
    const filled = await page.locator(".pitch-slot.filled").count();
    const enabled = await page.locator(".readiness-card .primary-button").isEnabled();
    const budgetText = await page.locator(".budget-head small").innerText();
    const remainingText = await page.locator(".budget-card > strong").innerText();
    const rating = Number(await page.locator(".score-pill strong").innerText());
    results.push({ budget: mode.budget, filled, enabled, budgetText, remainingText, rating });
  }

  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  const flagsLoaded = await page.locator(".nation-card .flag-image").evaluateAll((images) =>
    images.length === 48 && images.every((image) => image.complete && image.naturalWidth > 0)
  );
  await page.screenshot({
    path: "C:\\Users\\kerims\\.codex\\visualizations\\2026\\07\\21\\019f86a8-e8f8-7a12-9bda-fcf145a7e02b\\global-cup-difficulties.png",
    fullPage: false,
  });

  await page.getByRole("button", { name: /Аргентина/ }).click();
  await page.getByRole("button", { name: /Собрать автоматически/ }).click();
  await page.getByRole("button", { name: /Оценить и играть/ }).click();
  await page.getByRole("button", { name: /Начать чемпионат/ }).click();
  await page.getByRole("button", { name: /Сыграть матч/ }).click();
  await page.evaluate(() => {
    const key = "global-cup-draft-v3";
    const saved = JSON.parse(localStorage.getItem(key));
    const fixture = saved.tournament.history.at(-1);
    fixture.result.report.events[0] = {
      minute: 26,
      type: "goal",
      teamId: fixture.awayId,
      player: "Mohamed Mahran Mahmoud Salah",
      assistant: "Charles Marc De Ketelaere",
      detail: "Гол · пас: Charles Marc De Ketelaere",
    };
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "networkidle" });
  const eventNameStyle = await page.locator(".event-period > div:not(.period-label) span strong").first().evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      whiteSpace: style.whiteSpace,
      overflow: style.overflow,
      text: element.textContent,
      hasLineBreak: element.getBoundingClientRect().height > Number.parseFloat(style.lineHeight) * 1.5,
      visible: element.getBoundingClientRect().height > 0,
    };
  });
  await page.screenshot({
    path: "C:\\Users\\kerims\\.codex\\visualizations\\2026\\07\\21\\019f86a8-e8f8-7a12-9bda-fcf145a7e02b\\global-cup-short-names.png",
    fullPage: true,
  });

  const checksPassed = results.every((result) =>
    result.filled === 11
    && result.enabled
    && result.budgetText.includes(String(result.budget))
    && result.rating >= 78
  )
    && flagsLoaded
    && eventNameStyle.whiteSpace === "nowrap"
    && eventNameStyle.overflow === "hidden"
    && eventNameStyle.text === "Mohamed Salah"
    && !eventNameStyle.hasLineBreak
    && eventNameStyle.visible
    && errors.length === 0;

  console.log(JSON.stringify({ results, flagsLoaded, eventNameStyle, errors, checksPassed }, null, 2));
  if (!checksPassed) process.exitCode = 1;
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
