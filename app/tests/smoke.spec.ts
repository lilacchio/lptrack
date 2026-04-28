import { expect, test } from "@playwright/test";

test.describe("home", () => {
  test("renders headline + nav buttons + has no console errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
    });

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /LPing is a sport now\./ })
    ).toBeVisible();
    const cta = page.getByText("View styleguide", { exact: true });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/styleguide");

    expect(errors).toEqual([]);
  });
});

test.describe("styleguide — design system", () => {
  test("all 4 arena swatches render with distinct backgrounds", async ({
    page,
  }) => {
    await page.goto("/styleguide");

    const keys = ["emerald", "orange", "sky", "violet"] as const;
    const seen = new Set<string>();

    for (const k of keys) {
      const swatch = page.getByTestId(`arena-swatch-${k}`);
      await expect(swatch).toBeVisible();
      const bg = await swatch.evaluate(
        (el) => getComputedStyle(el).backgroundColor
      );
      // Non-empty + not transparent
      expect(bg).not.toBe("");
      expect(bg).not.toBe("rgba(0, 0, 0, 0)");
      seen.add(bg);
    }
    // All four resolved to distinct background colors
    expect(seen.size).toBe(4);
  });

  test("Inter Tight + JetBrains Mono are applied", async ({ page }) => {
    await page.goto("/styleguide");

    const sansFamily = await page
      .getByTestId("font-sans-sample")
      .evaluate((el) => getComputedStyle(el).fontFamily);
    expect(sansFamily.toLowerCase()).toContain("inter tight");

    const monoFamily = await page
      .getByTestId("font-mono-sample")
      .evaluate((el) => getComputedStyle(el).fontFamily);
    expect(monoFamily.toLowerCase()).toContain("jetbrains mono");
  });
});
