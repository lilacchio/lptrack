import { expect, test } from "@playwright/test";

test.describe("/not-connected", () => {
  test("renders the wallet-gate copy + back link with no console errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
    });

    await page.goto("/not-connected");
    await expect(page.getByTestId("not-connected-headline")).toBeVisible();
    await expect(page.getByText("Back to arenas", { exact: false })).toBeVisible();

    expect(errors).toEqual([]);
  });
});
