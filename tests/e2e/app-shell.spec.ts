import { expect, test } from "@playwright/test";

test.setTimeout(90_000);

async function signInAsDepartment(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /Department/ }).click();
  await page.getByLabel("Email address").fill("department@nexustrace.demo");
  await page.getByLabel("Password", { exact: true }).fill("NexusTraceDemo!2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}

test("authenticated shell supports compact desktop navigation and mobile drawer", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signInAsDepartment(page);

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByLabel("NexusTrace navigation")).toBeVisible();
  await expect(page.getByLabel("NexusTrace navigation").getByText("NEXUSTRACE")).toHaveCount(0);

  await page.getByLabel("NexusTrace navigation").hover();
  await expect(page.getByLabel("NexusTrace navigation").getByText("NEXUSTRACE")).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Open network" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("dashboard-shell.png"), fullPage: true });

  await page.getByRole("link", { name: "Cases", exact: true }).click();
  await expect(page).toHaveURL(/\/cases$/);
  await expect(page.getByRole("heading", { name: "Cases" })).toBeVisible();
  await expect(page.locator(".page-header").getByRole("link", { name: "Register case" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Cases", exact: true })).toHaveAttribute("aria-current", "page");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("cases-shell.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByLabel("Mobile navigation")).toBeVisible();
  await expect(page.getByLabel("Mobile navigation").getByText("Department")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Mobile navigation")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("cases-mobile-shell.png"), fullPage: true });
});
