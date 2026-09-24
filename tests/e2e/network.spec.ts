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

  const relationshipResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/network" && response.status() === 200);
  await page.getByRole("button", { name: "Relationship", exact: true }).click();
  await relationshipResponse;
  await expect(page.getByLabel("Criminal network investigation graph")).toBeVisible();
  const expandedGraph = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/network" && response.status() === 200);
  await page.getByRole("button", { name: "Expand connections", exact: true }).click();
  await expandedGraph;
  await expect(page.getByLabel("Criminal network investigation graph")).toBeVisible();
  const collapsedGraph = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/network" && response.status() === 200);
  await page.getByRole("button", { name: "Collapse", exact: true }).click();
  await collapsedGraph;
  await expect(page.getByLabel("Criminal network investigation graph")).toBeVisible();
  const relationshipCanvas = page.locator(".network-canvas");
  await expect(relationshipCanvas).toBeVisible();
  const screenSpaceMeasurements = await relationshipCanvas.evaluate(async (canvas) => {
    type ClientNode = {
      data: (name: string) => string;
      renderedWidth: () => number;
      pstyle: (name: string) => { pfValue: number };
    };
    type ClientGraph = {
      zoom: (level?: number) => number;
      nodes: () => { toArray: () => ClientNode[] };
    };
    const graph = (canvas as HTMLDivElement & { __nexusTraceCy?: ClientGraph }).__nexusTraceCy;
    if (!graph) throw new Error("Relationship graph test handle is unavailable.");
    const nodeForLabel = (label: string) => {
      const node = graph.nodes().toArray().find((item) => item.data("label") === label);
      if (!node) throw new Error(`Graph node ${label} is unavailable.`);
      return node;
    };
    const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const measurements: Array<{ zoom: number; arjun: { badge: number; icon: number; label: number }; meera: { badge: number; icon: number; label: number } }> = [];
    for (const zoom of [0.5, 0.75, 1, 1.25, 1.5, 2]) {
      graph.zoom(zoom);
      await nextFrame();
      const measure = (label: string) => {
        const node = nodeForLabel(label);
        return {
          badge: node.renderedWidth(),
          icon: node.pstyle("background-width").pfValue * graph.zoom(),
          label: node.pstyle("font-size").pfValue * graph.zoom(),
        };
      };
      measurements.push({ zoom, arjun: measure("Arjun Mehta"), meera: measure("Meera Nair") });
    }
    graph.zoom(1);
    await nextFrame();
    return measurements;
  });
  await testInfo.attach("relationship-screen-space-metrics", { body: JSON.stringify(screenSpaceMeasurements, null, 2), contentType: "application/json" });
  for (const measurement of screenSpaceMeasurements) {
    expect(measurement.arjun.badge).toBeGreaterThanOrEqual(57);
    expect(measurement.arjun.badge).toBeLessThanOrEqual(59);
    expect(measurement.meera.badge).toBeGreaterThanOrEqual(49);
    expect(measurement.meera.badge).toBeLessThanOrEqual(51);
    expect(measurement.arjun.icon / measurement.arjun.badge).toBeCloseTo(0.58, 2);
    expect(measurement.meera.icon / measurement.meera.badge).toBeCloseTo(0.58, 2);
    expect(measurement.arjun.label).toBeGreaterThanOrEqual(11);
    expect(measurement.arjun.label).toBeLessThanOrEqual(13);
    expect(measurement.meera.label).toBeGreaterThanOrEqual(11);
    expect(measurement.meera.label).toBeLessThanOrEqual(13);
  }
  const canvasBox = await relationshipCanvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  await relationshipCanvas.hover({ position: { x: canvasBox!.width / 2, y: canvasBox!.height / 2 } });
  await page.mouse.wheel(0, 720);
  await expect(page.getByLabel("Criminal network investigation graph")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("relationship-zoomed-out.png"), fullPage: false });
  await page.mouse.wheel(0, -1_440);
  await expect(page.getByLabel("Criminal network investigation graph")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("relationship-zoomed-in.png"), fullPage: false });
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  await page.getByRole("button", { name: "Recenter", exact: true }).click();
  await page.getByRole("button", { name: "Clear focus", exact: true }).click();
  await expect(page.getByLabel("Criminal network investigation graph")).toBeVisible();
  await page.setViewportSize({ width: 1200, height: 900 });
  await expect(relationshipCanvas).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("relationship-resized.png"), fullPage: false });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await expect(page.getByRole("button", { name: "Done", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.mouse.move(canvasBox!.x + canvasBox!.width / 2, canvasBox!.y + canvasBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBox!.x + canvasBox!.width / 2 + 54, canvasBox!.y + canvasBox!.height / 2 + 36, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("relationship-network.png"), fullPage: false });
  await page.waitForTimeout(450);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Network console" })).toBeVisible();
  const reloadedRelationship = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/network" && response.status() === 200);
  await page.getByRole("button", { name: "Relationship", exact: true }).click();
  await reloadedRelationship;
  await expect(page.getByLabel("Criminal network investigation graph")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("relationship-reloaded.png"), fullPage: false });
  await page.getByRole("button", { name: "Geographic", exact: true }).click();
  await expect(page.locator(".network-geographic-map .maplibregl-canvas")).toBeVisible();
  await expect(page.locator('.network-geographic-map[data-map-loaded="true"]')).toBeVisible({ timeout: 20_000 });

  await page.screenshot({ path: testInfo.outputPath("network-console.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  const [mobileCanvasBox, leftRailBox] = await Promise.all([
    page.locator(".network-primary-surface").boundingBox(),
    page.locator(".network-analysis-left").boundingBox(),
  ]);
  expect(mobileCanvasBox).not.toBeNull();
  expect(leftRailBox).not.toBeNull();
  expect(mobileCanvasBox!.y).toBeLessThan(leftRailBox!.y);
  expect(mobileCanvasBox!.width).toBeLessThanOrEqual(390);
  await expect(page.getByLabel("Event timeline")).toBeVisible();
  await expect(page.getByRole("button", { name: "Primary relationships" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("network-console-mobile.png"), fullPage: true });
});
