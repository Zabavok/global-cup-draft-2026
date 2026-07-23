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
  const autoRating = await page.locator(".score-pill strong").innerText();
  const visiblePrice = await page.locator(".player-price").first().innerText();
  let tableAfterFirst = [];
  let playedAfterFirst = [];
  let reportEvents = 0;
  let possibleOpponent = 0;
  await page.screenshot({ path: "C:\\Users\\kerims\\.codex\\visualizations\\2026\\07\\21\\019f86a8-e8f8-7a12-9bda-fcf145a7e02b\\global-cup-v2-draft.png", fullPage: true });

  if (enabled) {
    await evaluate.click();
    await page.getByRole("button", { name: /Начать чемпионат/ }).click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: "C:\\Users\\kerims\\.codex\\visualizations\\2026\\07\\21\\019f86a8-e8f8-7a12-9bda-fcf145a7e02b\\global-cup-v2-tournament.png", fullPage: true });
    const firstPlay = page.getByRole("button", { name: /Сыграть матч/ });
    await firstPlay.click();
    await page.waitForTimeout(150);
    tableAfterFirst = await page.locator(".group-table > div:not(.table-head)").allInnerTexts();
    playedAfterFirst = await page.locator(".group-table > div:not(.table-head) > b:first-of-type").allInnerTexts();
    reportEvents = await page.locator(".match-report .event-list > div").count();
    await page.screenshot({ path: "C:\\Users\\kerims\\.codex\\visualizations\\2026\\07\\21\\019f86a8-e8f8-7a12-9bda-fcf145a7e02b\\global-cup-v3-report.png", fullPage: true });
    for (let match = 1; match < 3; match += 1) {
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
      possibleOpponent = await page.locator(".next-opponent").count();
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
  const checksPassed = nationCount === 48
    && coachCount === 48
    && filled === 11
    && Number(autoRating) >= 80
    && playedAfterFirst.length === 4
    && playedAfterFirst.every((value) => value === "1")
    && reportEvents > 0
    && possibleOpponent > 0
    && errors.length === 0;
  console.log(JSON.stringify({
    nationCount,
    coachCount,
    firstCoachText,
    filled,
    autoRating,
    visiblePrice,
    evaluateEnabled: enabled,
    tableAfterFirst,
    playedAfterFirst,
    reportEvents,
    possibleOpponent,
    bodyHasGroupOrEnding: /Групповой этап|ВЫШЕЛ В ПЛЕЙ-ОФФ|Турнир окончен|ТУРНИР ОКОНЧЕН|ЧЕМПИОН/.test(bodyText),
    finalHeading: await page.locator("h1, h2").allInnerTexts(),
    errors,
    checksPassed,
  }, null, 2));
  if (!checksPassed) process.exitCode = 1;
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
