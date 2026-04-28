import { expect, test } from "@playwright/test";

test.describe("featured-arena banner", () => {
  test("renders, links to /arena/{PDA}/enter, and the wizard resolves to a real on-chain arena", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
    });

    await page.goto("/");
    const banner = page.getByTestId("featured-arena-banner");
    await expect(banner).toBeVisible({ timeout: 15_000 });
    const href = await banner.getAttribute("href");
    expect(href).toMatch(/^\/arena\/[A-Za-z0-9]+\/enter$/);

    await banner.click();
    await page.waitForURL(/\/arena\/[A-Za-z0-9]+\/enter$/);
    await expect(page.getByTestId("entry-wizard")).toBeVisible();

    // Because the URL pubkey IS a real arena PDA, the wizard should NOT show
    // the create-long-arena hint.
    await expect(
      page.getByText("create-long-arena", { exact: false })
    ).toHaveCount(0, { timeout: 10_000 });

    expect(errors).toEqual([]);
  });
});
