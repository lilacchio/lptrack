import { expect, test } from "@playwright/test";

// A real-on-mainnet wallet with active LP Agent activity. If LP Agent ever
// drops their record we'd need to swap this — for now it's the safest bet.
const KNOWN_LP = "B5FgWveeRLR3jjbcTEMBMJD2aQxJrtTkgNd2wYELXV2e";

test.describe("/profile/[pubkey]", () => {
  test("renders KPIs + equity curve + open + closed cards with no console errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
    });

    await page.goto(`/profile/${KNOWN_LP}`);

    await expect(page.getByTestId("profile-pubkey")).toBeVisible();
    await expect(page.getByTestId("profile-kpis")).toBeVisible();
    await expect(page.getByTestId("trophy-case-open")).toBeVisible();
    await expect(page.getByTestId("trophy-case-history")).toBeVisible();

    // Equity curve mounts in either of two states — chart or empty hint.
    const eq = page.getByTestId("equity-curve");
    const eqEmpty = page.getByTestId("equity-curve-empty");
    await expect(eq.or(eqEmpty)).toBeVisible();

    expect(errors).toEqual([]);
  });
});
