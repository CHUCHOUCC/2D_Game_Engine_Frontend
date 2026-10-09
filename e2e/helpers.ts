import { expect, type Page } from "@playwright/test";

export const PASSWORD = "caballo verde saltarin";

/** A fresh account for each test, so tests never depend on each other. */
export function newUser() {
  const id = Math.random().toString(36).slice(2, 10);
  return { username: `jugador${id}`, email: `jugador.${id}@motor2d.test`, password: PASSWORD };
}

export type User = ReturnType<typeof newUser>;

export async function register(page: Page, user: User): Promise<void> {
  await page.goto("/");
  await page.getByRole("tab", { name: "Crear cuenta" }).click();
  await page.getByLabel("Nombre de usuario").fill(user.username);
  await page.getByLabel("Correo electrónico").fill(user.email);
  await page.locator("#auth-password").fill(user.password);
  await page.locator("#auth-submit").click();
  await expect(page.locator("#app")).toBeVisible();
  await expect(page.locator("#loader")).toBeHidden();
}

export async function logIn(page: Page, user: User): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill(user.email);
  await page.locator("#auth-password").fill(user.password);
  await page.locator("#auth-submit").click();
  await expect(page.locator("#app")).toBeVisible();
}

/** Create a project from a template through the dialog. */
export async function createProject(page: Page, name: string, template = "village"): Promise<void> {
  await page.getByRole("button", { name: "+ Nuevo" }).click();
  await page.locator("#new-project-name").fill(name);
  await page.locator(`#templates input[value="${template}"]`).check();
  await page.getByRole("button", { name: "Crear", exact: true }).click();
  await expect(page.locator("#project-name")).toHaveValue(name);
}

/** Where a world point is on the screen, using the editor's current zoom (view is centred). */
export async function screenPoint(page: Page, worldX: number, worldY: number) {
  const box = (await page.locator("#game canvas").boundingBox())!;
  const zoom = Number((await page.locator("#zoom-value").textContent())!.replace("%", "")) / 100;
  return { x: box.x + box.width / 2 + (worldX - 800) * zoom, y: box.y + box.height / 2 + (worldY - 480) * zoom };
}

export async function objectCount(page: Page): Promise<number> {
  const text = (await page.locator("#status-objects").textContent()) ?? "";
  return Number(text.split(" ")[0]);
}
