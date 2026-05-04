import { test, expect } from "@playwright/test";

test.describe("Case O1 - Ops Admin Panel UI Acceptance", () => {
  test.use({ baseURL: "http://localhost:3010" });

  async function loginAs(page, username = "superadmin", password = "123456") {
    await page.goto("/ops/login");
    await page.waitForLoadState("networkidle");
    await page.getByPlaceholder("用户名").fill(username);
    await page.getByPlaceholder("密码").fill(password);
    await page.getByRole("button", { name: "登 录" }).click();
    await page.waitForURL("**/ops/dashboard", { timeout: 10000 });
    await page.waitForTimeout(3000);
  }

  test("Step 1 - Login to Ops", async ({ page }) => {
    await page.goto("/ops/login");
    await page.waitForLoadState("networkidle");

    await expect(page.getByPlaceholder("用户名")).toBeVisible();
    await expect(page.getByPlaceholder("密码")).toBeVisible();
    await expect(page.getByRole("button", { name: "登 录" })).toBeVisible();

    await page.getByPlaceholder("用户名").fill("superadmin");
    await page.getByPlaceholder("密码").fill("123456");
    await page.getByRole("button", { name: "登 录" }).click();

    await page.waitForURL("**/ops/dashboard", { timeout: 10000 });
    console.log("STEP 1: PASS");
    console.log("  URL after login:", page.url());
    console.log("  Title:", await page.title());
  });

  test("Step 2 - Dashboard verification", async ({ page }) => {
    await loginAs(page);
    await page.waitForSelector("text=Dashboard", { timeout: 10000 });

    const bodyText = await page.locator("body").innerText();
    console.log("STEP 2: Dashboard Data");
    console.log("  Body text (first 2000 chars):", bodyText.substring(0, 2000));

    const hasDashboard = bodyText.includes("Dashboard");
    const hasTotalTodos =
      bodyText.includes("Total Todos") || bodyText.includes("待办");
    const hasPending =
      bodyText.includes("Pending") || bodyText.includes("进行中");
    const hasCompleted =
      bodyText.includes("Completed") || bodyText.includes("已完成");
    console.log("  Has Dashboard heading:", hasDashboard);
    console.log("  Has Total Todos:", hasTotalTodos);
    console.log("  Has Pending:", hasPending);
    console.log("  Has Completed:", hasCompleted);

    const statsCards = page.locator("h3");
    const cardCount = await statsCards.count();
    console.log("  Stats card count:", cardCount);
    for (let i = 0; i < cardCount; i++) {
      console.log("    Card:", await statsCards.nth(i).innerText());
    }

    const hasUserCount = bodyText.includes("用户") || bodyText.includes("User");
    const hasOrderCount =
      bodyText.includes("订单") || bodyText.includes("Order");
    const hasActivityList =
      bodyText.includes("活动") ||
      bodyText.includes("Activity") ||
      bodyText.includes("最近");
    const hasChart =
      bodyText.includes("每日") ||
      bodyText.includes("Daily") ||
      bodyText.includes("趋势");
    console.log("  Has user count:", hasUserCount);
    console.log("  Has order count:", hasOrderCount);
    console.log("  Has activity list:", hasActivityList);
    console.log("  Has charts/daily stats:", hasChart);
  });

  test("Step 3 - Navigate to Monitor", async ({ page }) => {
    await loginAs(page);
    await page.goto("/ops/system/monitor");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const bodyText = await page.locator("body").innerText();
    console.log("STEP 3: Monitor Page");
    console.log("  URL:", page.url());
    console.log("  Body text (first 2000 chars):", bodyText.substring(0, 2000));

    const hasUptime =
      bodyText.includes("uptime") ||
      bodyText.includes("运行时间") ||
      bodyText.includes("Uptime");
    const hasMemory =
      bodyText.includes("memory") ||
      bodyText.includes("内存") ||
      bodyText.includes("Memory") ||
      bodyText.includes("Heap");
    const hasDbStatus =
      bodyText.includes("database") ||
      bodyText.includes("数据库") ||
      bodyText.includes("Database") ||
      bodyText.includes("connected");
    const hasCpu = bodyText.includes("cpu") || bodyText.includes("CPU");
    console.log("  Has uptime:", hasUptime);
    console.log("  Has memory:", hasMemory);
    console.log("  Has DB status:", hasDbStatus);
    console.log("  Has CPU:", hasCpu);
  });

  test("Step 4 - Navigate to Settings", async ({ page }) => {
    await loginAs(page);
    await page.goto("/ops/system/settings");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const bodyText = await page.locator("body").innerText();
    console.log("STEP 4: Settings Page");
    console.log("  URL:", page.url());
    console.log("  Body text (first 2000 chars):", bodyText.substring(0, 2000));

    const inputs = page.locator("input, textarea, select");
    const inputCount = await inputs.count();
    console.log("  Form fields count:", inputCount);
    for (let i = 0; i < Math.min(inputCount, 10); i++) {
      const el = inputs.nth(i);
      const placeholder = (await el.getAttribute("placeholder")) || "";
      const label = (await el.getAttribute("aria-label")) || "";
      const value = await el.inputValue();
      console.log(
        `    Field ${i}: placeholder="${placeholder}" label="${label}" value="${value}"`,
      );
    }
  });

  test("Step 5 - Navigate to Permissions", async ({ page }) => {
    await loginAs(page);
    await page.goto("/ops/system/permissions");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const bodyText = await page.locator("body").innerText();
    console.log("STEP 5: Permissions Page");
    console.log("  URL:", page.url());
    console.log("  Body text (first 2000 chars):", bodyText.substring(0, 2000));

    const hasPermission =
      bodyText.includes("权限") || bodyText.includes("Permission");
    const hasRole = bodyText.includes("角色") || bodyText.includes("Role");
    console.log("  Has permission data:", hasPermission);
    console.log("  Has role data:", hasRole);
  });

  test("Step 6 - Navigate to Roles", async ({ page }) => {
    await loginAs(page);
    await page.goto("/ops/system/roles");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const bodyText = await page.locator("body").innerText();
    console.log("STEP 6: Roles Page");
    console.log("  URL:", page.url());
    console.log("  Body text (first 2000 chars):", bodyText.substring(0, 2000));

    const tableRows = page.locator("tr");
    const rowCount = await tableRows.count();
    console.log("  Table rows count:", rowCount);

    const hasRoleList =
      bodyText.includes("super_admin") ||
      bodyText.includes("customer_service") ||
      bodyText.includes("超级管理员");
    console.log("  Has role list:", hasRoleList);
  });
});
