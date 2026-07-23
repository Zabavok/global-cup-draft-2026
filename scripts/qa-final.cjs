const { chromium } = require("playwright");

const storageKey = "global-cup-draft-v3";
const screenshotRoot = "C:\\Users\\kerims\\.codex\\visualizations\\2026\\07\\21\\019f86a8-e8f8-7a12-9bda-fcf145a7e02b";

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
  await page.getByRole("button", { name: /Аргентина/ }).click();
  await page.getByRole("button", { name: /Собрать автоматически/ }).click();
  await page.getByRole("button", { name: /Оценить и играть/ }).click();
  await page.getByRole("button", { name: /Начать чемпионат/ }).click();
  await page.getByRole("button", { name: /Сыграть матч/ }).click();

  await page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key));
    const userId = saved.selectedNationId;
    const opponentIds = [...new Set(saved.tournament.fixtures.flatMap((fixture) => [fixture.homeId, fixture.awayId]))]
      .filter((id) => id !== userId)
      .slice(0, 3);
    const sampleReport = saved.tournament.history[0].result.report;
    saved.tournament = {
      ...saved.tournament,
      stage: "knockout-summary",
      round: {
        name: "Полуфинал",
        index: 3,
        matches: [
          {
            id: "qa-semifinal-user",
            homeId: userId,
            awayId: opponentIds[0],
            result: { homeGoals: 0, awayGoals: 1, penalties: null, report: sampleReport },
          },
          {
            id: "qa-semifinal-other",
            homeId: opponentIds[1],
            awayId: opponentIds[2],
            result: { homeGoals: 2, awayGoals: 1, penalties: null },
          },
        ],
      },
    };
    localStorage.setItem(key, JSON.stringify(saved));
  }, storageKey);

  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Продолжить/ }).click();
  const thirdPlaceHeading = await page.getByRole("heading", { name: /Матч за 3-е место/ }).count();
  await page.getByRole("button", { name: /Сыграть матч/ }).click();
  const thirdPlaceSummary = await page.getByText(/Матч за 3-е место завершён/).count();
  await page.getByRole("button", { name: /Подвести итоги/ }).click();
  const medalEnding = await page.locator(".ending-screen.bronze, .ending-screen.fourth").count();

  await page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key));
    saved.tournament = {
      ...saved.tournament,
      stage: "champion",
      placement: 1,
      message: "Ты выиграл чемпионат мира!",
    };
    localStorage.setItem(key, JSON.stringify(saved));
  }, storageKey);
  await page.reload({ waitUntil: "networkidle" });
  await page.screenshot({ path: `${screenshotRoot}\\global-cup-final-champion.png`, fullPage: true });
  const champion = await page.locator(".ending-screen.champion").count();
  const watermark = await page.locator(".ending-watermark").count();
  const leaders = await page.locator(".team-leaders").count();

  const checksPassed = thirdPlaceHeading === 1
    && thirdPlaceSummary === 1
    && medalEnding === 1
    && champion === 1
    && watermark === 1
    && leaders === 1
    && errors.length === 0;

  console.log(JSON.stringify({
    thirdPlaceHeading,
    thirdPlaceSummary,
    medalEnding,
    champion,
    watermark,
    leaders,
    errors,
    checksPassed,
  }, null, 2));
  if (!checksPassed) process.exitCode = 1;
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
