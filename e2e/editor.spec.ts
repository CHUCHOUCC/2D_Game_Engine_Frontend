import { expect, test } from "@playwright/test";
import { createProject, newUser, objectCount, register, screenPoint } from "./helpers";

test.beforeEach(async ({ page }) => {
  await register(page, newUser());
});

test("the editor uses the whole window", async ({ page }) => {
  const app = (await page.locator("#app").boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(app.width).toBe(viewport.width);
  expect(app.height).toBe(viewport.height);
  for (const id of ["#palette", "#inspector", "#game canvas", "#status"]) {
    await expect(page.locator(id)).toBeVisible();
  }
});

test("a project created from a template opens with its objects", async ({ page }) => {
  await createProject(page, "Aldea de prueba");
  expect(await objectCount(page)).toBe(6);
  await expect(page.locator("#projects")).toContainText("Aldea de prueba");
});

test("objects are placed from the palette, inspected, undone and redone", async ({ page }) => {
  await createProject(page, "Colocar");
  await page.getByRole("button", { name: /^Pared/ }).click();
  await expect(page.locator("#placing-hint")).toContainText("Pared");
  const point = await screenPoint(page, 1200, 800);
  await page.mouse.click(point.x, point.y);
  expect(await objectCount(page)).toBe(7);
  await expect(page.locator("#inspector")).toContainText("Pared");
  await page.keyboard.press("Escape");
  await page.locator("#btn-undo").click();
  expect(await objectCount(page)).toBe(6);
  await page.locator("#btn-redo").click();
  expect(await objectCount(page)).toBe(7);
});

test("only one player can be placed", async ({ page }) => {
  await createProject(page, "Un jugador");
  await page.getByRole("button", { name: /^Jugador/ }).click();
  const point = await screenPoint(page, 96, 480);
  await page.mouse.click(point.x, point.y);
  await expect(page.getByRole("button", { name: /^Jugador/ })).toBeDisabled();
});

test("saving keeps the changes after a reload", async ({ page }) => {
  await createProject(page, "Guardar");
  await page.getByRole("button", { name: /^Caja/ }).click();
  const point = await screenPoint(page, 1300, 300);
  await page.mouse.click(point.x, point.y);
  await page.keyboard.press("Escape");
  await expect(page).toHaveTitle(/^● /);
  await page.keyboard.press("Control+s");
  await expect(page.locator("#status")).toHaveText("Guardado: 7 objetos.");
  await expect(page).not.toHaveTitle(/^● /);
  await page.reload();
  expect(await objectCount(page)).toBe(7);
});

test("the AI places obstacles and keeps unsaved edits", async ({ page }) => {
  await createProject(page, "IA");
  await page.getByRole("button", { name: /^Jugador/ }).click();
  const point = await screenPoint(page, 96, 480);
  await page.mouse.click(point.x, point.y);
  await page.locator("#btn-ai-obstacles").click();
  await expect(page.locator(".toast").last()).toContainText("La IA colocó 6 obstáculos");
  expect(await objectCount(page)).toBe(13);
  await expect(page.getByRole("button", { name: /^Jugador/ })).toBeDisabled();
});

test("the AI understands a request in Spanish", async ({ page }) => {
  await createProject(page, "Vacío", "empty");
  await page.locator("#ai-prompt").fill("3 monedas y una casa en 400 300");
  await page.getByRole("button", { name: "Pedir a la IA" }).click();
  await expect(page.locator("#status-objects")).toContainText("4 objetos · 3 monedas");
});

test("the settings wheel switches to the light theme and remembers it", async ({ page }) => {
  await page.getByRole("button", { name: "Ajustes" }).click();
  await page.getByRole("button", { name: "☀ Claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.waitForTimeout(800); // settings are saved half a second after a change
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
