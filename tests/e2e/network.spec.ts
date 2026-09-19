import { expect, test } from "@playwright/test";

test.setTimeout(90_000);

test("authorized geographic network console stays synchronized", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const openFreeMapRequests: string[] = [];
  const legacyCartoRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("openfreemap.org")) openFreeMapRequests.push(request.url());
    if (request.url().includes("cartocdn.com")) legacyCartoRequests.push(request.url());
  });
  await page.goto("/login");
  await page.getByRole("button", { name: /Department/ }).click();
  await page.getByLabel("Email address").fill("department@nexustrace.demo");
  await page.getByLabel("Password", { exact: true }).fill("NexusTraceDemo!2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
  await page.goto("/network");

  await expect(page.getByRole("heading", { name: "Network console" })).toBeVisible();
  await expect(page.getByLabel("Event timeline")).toBeVisible();
  await expect(page.getByRole("button", { name: "Primary relationships" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Visible connections", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Create department incident" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Review department submissions" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Review cross-verification" })).toHaveCount(0);
  await expect(page.locator(".network-geographic-map .maplibregl-canvas")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.network-geographic-map[data-map-ready="true"]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.network-geographic-map[data-map-loaded="true"]')).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => openFreeMapRequests.some((url) => url.includes("/styles/liberty"))).toBe(true);
  expect(legacyCartoRequests).toEqual([]);
  await expect(page.locator(".network-geographic-map .maplibregl-ctrl-attrib")).toBeAttached();

  await page.getByRole("button", { name: "Secondary relationships" }).click();
  await expect(page.getByText("Residence X · Indiranagar", { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Property Y · Central Bengaluru", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Relationship", exact: true }).click();
  await expect(page.getByLabel("Criminal network investigation graph")).toBeVisible();
  await page.getByRole("button", { name: "Geographic", exact: true }).click();
  await expect(page.locator(".network-geographic-map .maplibregl-canvas")).toBeVisible();
  await expect(page.locator('.network-geographic-map[data-map-loaded="true"]')).toBeVisible({ timeout: 20_000 });

  await page.screenshot({ path: testInfo.outputPath("network-console.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  const [canvasBox, leftRailBox] = await Promise.all([
    page.locator(".network-primary-surface").boundingBox(),
    page.locator(".network-analysis-left").boundingBox(),
  ]);
  expect(canvasBox).not.toBeNull();
  expect(leftRailBox).not.toBeNull();
  expect(canvasBox!.y).toBeLessThan(leftRailBox!.y);
  expect(canvasBox!.width).toBeLessThanOrEqual(390);
  await expect(page.getByLabel("Event timeline")).toBeVisible();
  await expect(page.getByRole("button", { name: "Primary relationships" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("network-console-mobile.png"), fullPage: true });
});
