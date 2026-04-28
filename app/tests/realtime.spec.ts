import { expect, test } from "@playwright/test";

test.describe("realtime + feel-alive", () => {
  test("arena detail shows ledger + leaderboard tick + countdown for the featured arena", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
    });

    // Hit the FEATURED_ARENA_POOL detail page so the countdown kicks in.
    await page.goto("/arena/6AJYTtz4h3HdxNcu66jdzLLWjggyfuEvRYa7tfPbxThi");
    await expect(page.getByTestId("arena-pair")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("ledger")).toBeVisible();
    await expect(page.getByTestId("leaderboard-tick")).toBeVisible();
    await expect(page.getByTestId("arena-countdown")).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("non-featured pool detail page renders without the countdown", async ({
    page,
  }) => {
    await page.goto("/");
    const cards = page.getByTestId("arena-card");
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });
    // Find a card that isn't the featured pool.
    const count = await cards.count();
    let nonFeaturedHref: string | null = null;
    for (let i = 0; i < count; i++) {
      const href = await cards.nth(i).getAttribute("href");
      if (
        href &&
        !href.includes("6AJYTtz4h3HdxNcu66jdzLLWjggyfuEvRYa7tfPbxThi")
      ) {
        nonFeaturedHref = href;
        break;
      }
    }
    if (!nonFeaturedHref) return; // nothing to assert if every card is the featured one
    await page.goto(nonFeaturedHref);
    await expect(page.getByTestId("arena-pair")).toBeVisible({
      timeout: 15_000,
    });
    // Ledger + leaderboard always render. Countdown only appears for arenas
    // we've spun up on-chain.
    await expect(page.getByTestId("ledger")).toBeVisible();
    await expect(page.getByTestId("arena-countdown")).toHaveCount(0);
  });
});
