import { expect, type Page } from "@playwright/test";

export const PASSWORD = "caballo verde saltarin";

/** A fresh account for each test, so tests never depend on each other. */
export function newUser() {
  const id = Math.random().toString(36).slice(2, 10);
  return { username: `jugador${id}`, email: `jugador.${id}@pixelforge.test`, password: PASSWORD };
}

export type User = ReturnType<typeof newUser>;

/** Fill and send the register form; the intro starts after it. */
export async function fillRegister(page: Page, user: User): Promise<void> {
  await page.goto("/");
  await page.getByRole("tab", { name: "Crear cuenta" }).click();
  await page.getByLabel("Nombre de usuario").fill(user.username);
  await page.getByLabel("Correo electrónico").fill(user.email);
  await page.locator("#auth-password").fill(user.password);
  await page.locator("#auth-confirm").fill(user.password);
  await page.locator("#auth-terms").check();
  await page.locator("#auth-submit").click();
}

/** After logging in: skip the intro and wait for the home menu. */
export async function reachHome(page: Page): Promise<void> {
  await expect(page.locator("#intro")).toBeVisible();
  await page.locator("#intro-skip").click();
  await expect(page.locator("#home")).toBeVisible();
  await expect(page.locator("#loader")).toBeHidden();
}

/** From the home menu to the editor. */
export async function openEditor(page: Page): Promise<void> {
  await page.locator('.option[data-go="editor"]').click();
  await expect(page.locator("#app")).toBeVisible();
}

/** Register a new account and end in the editor (or in the home menu). */
export async function register(page: Page, user: User, to: "editor" | "home" = "editor"): Promise<void> {
  await fillRegister(page, user);
  await reachHome(page);
  if (to === "editor") await openEditor(page);
}

export async function logIn(page: Page, user: User, to: "editor" | "home" = "editor"): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill(user.email);
  await page.locator("#auth-password").fill(user.password);
  await page.locator("#auth-submit").click();
  await reachHome(page);
  if (to === "editor") await openEditor(page);
}

/** Create a project from a template through the dialog. */
export async function createProject(page: Page, name: string, template = "village"): Promise<void> {
  await page.getByRole("tab", { name: "Proyectos" }).click();
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
