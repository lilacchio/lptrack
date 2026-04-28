import { expect, test } from "@playwright/test";

test.describe("wallet connect", () => {
  test("home renders ConnectButton in disconnected state with no console errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
    });

    await page.goto("/");
    const btn = page.getByTestId("connect-button");
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await expect(btn).toHaveText(/Connect wallet/i);

    expect(errors).toEqual([]);
  });

  test("clicking ConnectButton opens the wallet adapter modal", async ({
    page,
  }) => {
    await page.goto("/");
    const btn = page.getByTestId("connect-button");
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await btn.click();
    // wallet-adapter modal injects this class on the root container.
    await expect(page.locator(".wallet-adapter-modal")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("/arena/[pubkey]/enter shows the no-on-chain-arena hint when URL pubkey isn't an arena PDA", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
    });

    await page.goto("/");
    const firstCard = page.getByTestId("arena-card").first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    const href = await firstCard.getAttribute("href");
    const pubkey = href!.split("/").pop()!;

    await page.goto(`/arena/${pubkey}/enter`);
    await expect(page.getByTestId("entry-wizard")).toBeVisible();
    // LP Agent pool addresses are not arena PDAs → wizard shows the hint
    // pointing at the long-running script.
    await expect(
      page.getByText("create-long-arena", { exact: false })
    ).toBeVisible({ timeout: 15_000 });

    expect(errors).toEqual([]);
  });
});
