import { expect, test } from "@playwright/test";

test.describe("/arena/[pubkey]/enter — wizard shell", () => {
  test("clicking 'Enter arena' from a card... lands on the wizard with all 3 steps rendered", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
    });

    // We hit the wizard directly via the first card's pubkey to avoid
    // depending on the (currently disabled) "Enter arena" CTA.
    await page.goto("/");
    const firstCard = page.getByTestId("arena-card").first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    const href = await firstCard.getAttribute("href");
    expect(href).toMatch(/^\/arena\//);
    const pubkey = href!.split("/").pop()!;

    await page.goto(`/arena/${pubkey}/enter`);
    await expect(page.getByTestId("entry-wizard")).toBeVisible();
    await expect(page.getByTestId("wizard-step-1")).toBeVisible();
    await expect(page.getByTestId("wizard-step-2")).toBeVisible();
    await expect(page.getByTestId("wizard-step-3")).toBeVisible();

    expect(errors).toEqual([]);
  });
});
