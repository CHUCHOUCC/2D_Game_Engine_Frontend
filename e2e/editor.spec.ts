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
  for (const id of ["#library", "#inspector", "#game canvas", "#status", "#btn-play"]) {
    await expect(page.locator(id)).toBeVisible();
  }
});

test("a project created from a template opens with its objects", async ({ page }) => {
  await createProject(page, "Aldea de prueba");
  expect(await objectCount(page)).toBe(6);
  await expect(page.locator("#projects")).toContainText("Aldea de prueba");
});

test("objects are painted with the brush, undone and redone", async ({ page }) => {
  await createProject(page, "Colocar");
  await page.getByRole("button", { name: /^Pared/ }).click();
  await expect(page.locator("#placing-hint")).toContainText("Pared");
  const point = await screenPoint(page, 1200, 800);
  await page.mouse.click(point.x, point.y);
  expect(await objectCount(page)).toBe(7);
  await expect(page.locator("#status")).toContainText("Pared colocado");
  await expect(page.locator('[data-tool="brush"]')).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-tool="select"]')).toHaveAttribute("aria-pressed", "true");
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
  await expect(page.locator("#status-objects")).toContainText("7 objetos");
});

test("the AI places obstacles and keeps unsaved edits", async ({ page }) => {
  await createProject(page, "IA");
  await page.getByRole("button", { name: /^Jugador/ }).click();
  const point = await screenPoint(page, 96, 480);
  await page.mouse.click(point.x, point.y);
  await page.getByRole("tab", { name: "IA" }).click();
  await page.locator("#btn-ai-obstacles").click();
  await expect(page.locator(".toast").last()).toContainText("La IA colocó 6 obstáculos");
  expect(await objectCount(page)).toBe(13);
  await expect(page.getByRole("button", { name: /^Jugador/ })).toBeDisabled();
});

test("the AI understands a request in Spanish", async ({ page }) => {
  await createProject(page, "Vacío", "empty");
  await page.getByRole("tab", { name: "IA" }).click();
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


test("2D characters are dragged from the library onto the map", async ({ page }) => {
  await createProject(page, "Personajes", "empty");
  await expect(page.locator("#empty-state")).toBeVisible();
  for (const [kind, x, y] of [["wizard", 600, 400], ["knight", 800, 400], ["villager", 1000, 400]] as const) {
    const point = await screenPoint(page, x, y);
    const stage = (await page.locator(".stage").boundingBox())!;
    await page.locator(`.palette-item[data-kind="${kind}"]`).dragTo(page.locator(".stage"), {
      targetPosition: { x: point.x - stage.x, y: point.y - stage.y },
    });
  }
  await expect(page.locator("#status-objects")).toContainText("3 objetos");
  await expect(page.locator("#status-objects")).toContainText("3 personajes");
  await expect(page.locator("#empty-state")).toBeHidden();
  await page.getByRole("tab", { name: "Escena" }).click();
  await expect(page.locator("#scene-tree")).toContainText("Mago");
  await expect(page.locator("#scene-tree")).toContainText("wizard-1");
});

test("the scene tree selects an object and shows it in the inspector", async ({ page }) => {
  await createProject(page, "Árbol de escena");
  await page.getByRole("tab", { name: "Escena" }).click();
  await expect(page.locator("#scene-count")).toHaveText("6");
  await page.getByRole("button", { name: /^house-1/ }).click();
  await expect(page.locator("#inspector")).toContainText("Casa");
  await expect(page.locator("#inspector")).toContainText("house-1");
});

test("the erase tool removes the object that is clicked", async ({ page }) => {
  await createProject(page, "Borrar", "empty");
  await page.getByRole("button", { name: /^Pared/ }).click();
  const point = await screenPoint(page, 816, 496);
  await page.mouse.click(point.x, point.y);
  expect(await objectCount(page)).toBe(1);
  await page.keyboard.press("e");
  await expect(page.locator('[data-tool="erase"]')).toHaveAttribute("aria-pressed", "true");
  await page.mouse.click(point.x, point.y);
  expect(await objectCount(page)).toBe(0);
});

test("the library search filters the objects", async ({ page }) => {
  await page.locator("#library-search").fill("mago");
  await expect(page.locator('.palette-item[data-kind="wizard"]')).toBeVisible();
  await expect(page.locator('.palette-item[data-kind="wall"]')).toBeHidden();
  await page.locator("#library-search").fill("arbol");
  await expect(page.locator('.palette-item[data-kind="tree"]')).toBeVisible();
});
