import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page, role: "Administrator" | "Department" | "Investigator") {
  await page.goto("/login");
  await page.getByRole("button", { name: new RegExp(role) }).click();
  const account = role === "Administrator" ? "admin@nexustrace.demo" : role === "Department" ? "department@nexustrace.demo" : "investigator@nexustrace.demo";
  await page.getByLabel("Email address").fill(account);
  await page.getByLabel("Password", { exact: true }).fill("NexusTraceDemo!2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}

test("department search remains scoped and administration is not navigable", async ({ page }) => {
  await signIn(page, "Department");
  await page.goto("/search");
  await page.getByRole("combobox").fill("FIR-108");
  await expect(page.getByRole("option", { name: "FIR-108 Coordinated account takeover reports · ACTIVE CASE" })).toBeVisible();
  await page.getByRole("combobox").fill("FIR-212");
  await expect(page.getByText("No authorized records found")).toBeVisible();
  await expect(page.getByRole("link", { name: "Administration" })).toHaveCount(0);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.evaluate(async () => (await fetch("/api/admin/users")).status)).resolves.toBe(403);
  await expect(page.evaluate(async () => (await fetch("/api/audit")).status)).resolves.toBe(403);
});

test("investigator cannot open administration or global audit routes", async ({ page }) => {
  await signIn(page, "Investigator");
  await page.goto("/search");
  await page.getByRole("combobox").fill("FIR-212");
  await expect(page.getByRole("option", { name: "FIR-212 Layered mule-account network · OPEN CASE" })).toBeVisible();
  await page.getByRole("combobox").fill("FIR-108");
  await expect(page.getByText("No authorized records found")).toBeVisible();
  await page.goto("/admin"); await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/audit"); await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.evaluate(async () => (await fetch("/api/admin/users")).status)).resolves.toBe(403);
  await expect(page.evaluate(async () => (await fetch("/api/audit")).status)).resolves.toBe(403);
});

test("administrator can search cross-department records and open governed consoles", async ({ page }) => {
  await signIn(page, "Administrator");
  await page.goto("/search");
  await page.getByRole("combobox").fill("FIR-212");
  await expect(page.getByRole("option", { name: "FIR-212 Layered mule-account network · OPEN CASE" })).toBeVisible();
  await page.getByRole("combobox").press("Enter");
  await expect(page).toHaveURL(/\/cases\/30000000-0000-4000-8000-000000000002$/);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Administration" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Departments" })).toBeVisible();
  const investigator = page.locator(".admin-user-row", { hasText: "Ishaan Sen" });
  await investigator.getByRole("button", { name: "Save" }).click();
  await expect(investigator.getByText("Saved and audited.")).toBeVisible();
  await page.goto("/audit");
  await expect(page.getByRole("heading", { name: "Global audit trail" })).toBeVisible();
  await expect(page.locator(".audit-event", { hasText: "ADMIN_USER_UPDATE" }).first()).toBeVisible();
});
