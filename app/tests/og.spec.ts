import { expect, test } from "@playwright/test";

test.describe("/arena/[pubkey] — OG / Twitter meta tags", () => {
  test("injects og:image + twitter:image pointing at /og/arena/[pubkey]", async ({
    page,
  }) => {
    await page.goto("/");
    const firstCard = page.getByTestId("arena-card").first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    const href = await firstCard.getAttribute("href");
    const pubkey = href!.split("/").pop()!;

    await page.goto(`/arena/${pubkey}`);

    const ogImage = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    const twImage = await page
      .locator('meta[name="twitter:image"]')
      .getAttribute("content");
    const twCard = await page
      .locator('meta[name="twitter:card"]')
      .getAttribute("content");

    expect(ogImage ?? "").toContain(`/og/arena/${pubkey}`);
    expect(twImage ?? "").toContain(`/og/arena/${pubkey}`);
    expect(twCard).toBe("summary_large_image");
  });
});

// Note: a live PNG-rendering test for /og/arena/[pubkey] is intentionally
// omitted while Next 16 dev + Turbopack on Windows fails to pipe
// ImageResponse streams. The route itself renders correctly under
// `next build && next start` and in production. Add a build-mode CI test
// when we wire the deploy pipeline.
