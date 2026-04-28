import { expect, test } from "@playwright/test";

test.describe("home — live arena grid", () => {
  test("renders ≥4 arena cards from LP Agent with no console errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
    });

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Live arenas/ })
    ).toBeVisible();

    const cards = page.getByTestId("arena-card");
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(4);

    // Each card has a non-empty pair label
    for (let i = 0; i < Math.min(count, 4); i++) {
      const pair = await cards
        .nth(i)
        .getByTestId("arena-card-pair")
        .textContent();
      expect(pair?.trim().length ?? 0).toBeGreaterThan(0);
      expect(pair).toMatch(/·/);
    }

    expect(errors).toEqual([]);
  });
});
