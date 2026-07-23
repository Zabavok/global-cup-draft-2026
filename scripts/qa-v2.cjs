const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  const nationCount = await page.locator(".nation-card").count();
  await page.screenshot({ path: "C:\\Users\\kerims\\.codex\\visualizations\\2026\\07\\21\\019f86a8-e8f8-7a12-9bda-fcf145a7e02b\\global-cup-v2-country.png", fullPage: true });
  await page.getByRole("button", { name: /Аргентина/ }).click();

  await page.locator(".coach-card").click();
  const coachCount = await page.locator(".coach-list > button").count();
  const firstCoachText = await page.locator(".coach-list > button").first().innerText();
  await page.screenshot({ path: "C:\\Users\\kerims\\.codex\\visualizations\\2026\\07\\21\\019f86a8-e8f8-7a12-9bda-fcf145a7e02b\\global-cup-v2-coaches.png", fullPage: false });
  await page.locator(".picker-modal .modal-close").click();

  await page.getByRole("button", { name: /Собрать автоматически/ }).click();
  await page.waitForTimeout(300);
  const filled = await page.locator(".pitch-slot.filled").count();
  const evaluate = page.getByRole("button", { name: /Оценить и играть/ });
  const enabled = await evaluate.isEnabled();
  await page.screenshot({ path: "C:\\Users\\kerims\\.codex\\visualizations\\2026\\07\\21\\019f86a8-e8f8-7a12-9bda-fcf145a7e02b\\global-cup-v2-draft.png", fullPage: true });

  if (enabled) {
    await evaluate.click();
    await page.getByRole("button", { name: /Начать чемпионат/ }).click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: "C:\\Users\\kerims\\.codex\\visualizations\\2026\\07\\21\\019f86a8-e8f8-7a12-9bda-fcf145a7e02b\\global-cup-v2-tournament.png", fullPage: true });
    for (let match = 0; match < 3; match += 1) {
      const play = page.getByRole("button", { name: /Сыграть матч/ });
      if (await play.count()) {
        await play.click();
        await page.waitForTimeout(120);
      }
    }
    await page.waitForTimeout(200);
    const bracket = page.getByRole("button", { name: /Открыть сетку/ });
    if (await bracket.count()) {
      await bracket.click();
      await page.waitForTimeout(120);
      for (let round = 0; round < 5; round += 1) {
        const knockoutPlay = page.getByRole("button", { name: /Сыграть матч/ });
        if (!(await knockoutPlay.count())) break;
        await knockoutPlay.click();
        await page.waitForTimeout(100);
        const next = page.getByRole("button", { name: /Продолжить/ });
        if (!(await next.count())) break;
        await next.click();
        await page.waitForTimeout(100);
      }
    }
  }

  const bodyText = await page.locator("body").innerText();
  console.log(JSON.stringify({
    nationCount,
    coachCount,
    firstCoachText,
    filled,
    evaluateEnabled: enabled,
    bodyHasGroupOrEnding: /Групповой этап|ВЫШЕЛ В ПЛЕЙ-ОФФ|Турнир окончен|ТУРНИР ОКОНЧЕН|ЧЕМПИОН/.test(bodyText),
    finalHeading: await page.locator("h1, h2").allInnerTexts(),
    errors,
  }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
