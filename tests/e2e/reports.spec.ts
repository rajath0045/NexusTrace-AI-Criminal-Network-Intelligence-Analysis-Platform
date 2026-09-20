import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page, email: string, role: string) { await page.goto("/login"); await page.getByRole("button", { name: new RegExp(role) }).click(); await page.getByLabel("Email address").fill(email); await page.getByLabel("Password", { exact: true }).fill("NexusTraceDemo!2026"); await page.getByRole("button", { name: "Sign in" }).click(); await page.waitForURL("**/dashboard"); }

test("authorized department operator generates a deterministic printable report", async ({ page }) => {
  await signIn(page, "department@nexustrace.demo", "Department");
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Reports", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Generate report" }).click();
  await expect(page).toHaveURL(/\/reports\/[0-9a-f-]+$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Case summary" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Unified timeline" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Provenance" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Print / Save PDF" })).toBeVisible();
});

test("investigator is denied a direct cross-department report API lookup", async ({ page }) => {
  await signIn(page, "investigator@nexustrace.demo", "Investigator");
  await expect(page.evaluate(async () => (await fetch("/api/reports/00000000-0000-4000-8000-000000000001")).status)).resolves.toBe(404);
});
