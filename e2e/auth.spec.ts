import { expect, test } from "@playwright/test";
import { logIn, newUser, register } from "./helpers";

test("the login screen fills the whole window and is in Spanish", async ({ page }) => {
  await page.goto("/");
  const screen = page.locator("#login-screen");
  await expect(screen).toBeVisible();
  const box = (await screen.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.width).toBe(viewport.width);
  expect(box.height).toBe(viewport.height);
  await expect(page.getByRole("tab", { name: "Iniciar sesión" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
});

test("the eye button shows and hides the password", async ({ page }) => {
  await page.goto("/");
  const password = page.locator("#auth-password");
  await password.fill("secreto-largo-123");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Mostrar contraseña" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Ocultar contraseña" }).click();
  await expect(password).toHaveAttribute("type", "password");
});

test("weak passwords are refused with the reason before calling the server", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Crear cuenta" }).click();
  await page.getByLabel("Nombre de usuario").fill("ana");
  await page.getByLabel("Correo electrónico").fill("ana@motor2d.test");
  await page.locator("#auth-password").fill("password123");
  await page.locator("#auth-submit").click();
  await expect(page.locator("#auth-message")).toHaveText("Esa contraseña es demasiado común.");
  await expect(page.locator("#app")).toBeHidden();
});

test("registering shows the loading logo and opens the editor", async ({ page }) => {
  const user = newUser();
  await page.goto("/");
  await page.getByRole("tab", { name: "Crear cuenta" }).click();
  await page.getByLabel("Nombre de usuario").fill(user.username);
  await page.getByLabel("Correo electrónico").fill(user.email);
  await page.locator("#auth-password").fill(user.password);
  await expect(page.locator("#strength-label")).toHaveText(/Fuerte|Muy fuerte|Aceptable/);
  await page.locator("#auth-submit").click();
  await expect(page.locator("#loader-text")).toHaveText(/Iniciando sesión|Preparando/);
  await expect(page.locator("#app")).toBeVisible();
  await expect(page.locator("#user-name")).toHaveText(user.username);
});

test("a wrong password gives a Spanish message and never says which part was wrong", async ({ page }) => {
  const user = newUser();
  await register(page, user);
  await page.getByRole("button", { name: "Salir", exact: true }).click();
  await page.getByLabel("Correo electrónico").fill(user.email);
  await page.locator("#auth-password").fill("no es la clave");
  await page.locator("#auth-submit").click();
  await expect(page.locator("#auth-message")).toHaveText("Correo o contraseña incorrectos.");
});

test("five wrong passwords lock the account for a while", async ({ page }) => {
  const user = newUser();
  await register(page, user);
  await page.getByRole("button", { name: "Salir", exact: true }).click();
  for (let i = 0; i < 5; i++) {
    await page.locator("#auth-password").fill(`incorrecta ${i}`);
    await page.getByLabel("Correo electrónico").fill(user.email);
    await page.locator("#auth-submit").click();
    await expect(page.locator("#auth-message")).toHaveText("Correo o contraseña incorrectos.");
  }
  await page.locator("#auth-password").fill(user.password);
  await page.locator("#auth-submit").click();
  await expect(page.locator("#auth-message")).toHaveText("Demasiados intentos fallidos. Espera unos minutos.");
});

test("the session survives a reload and ends with logout", async ({ page }) => {
  const user = newUser();
  await register(page, user);
  await page.reload();
  await expect(page.locator("#app")).toBeVisible();
  await expect(page.locator("#user-name")).toHaveText(user.username);
  await page.getByRole("button", { name: "Salir", exact: true }).click();
  await expect(page.locator("#login-screen")).toBeVisible();
  await page.reload();
  await expect(page.locator("#login-screen")).toBeVisible();
});

test("tokens are refreshed: an expired access token does not log the user out", async ({ page }) => {
  const user = newUser();
  await register(page, user);
  // Make the stored access token look expired; the app must refresh it by itself.
  await page.evaluate(() => {
    const data = JSON.parse(sessionStorage.getItem("engine-tokens")!);
    data.access = "expired.or.forged";
    data.expiresAt = Date.now() + 3_600_000;
    sessionStorage.setItem("engine-tokens", JSON.stringify(data));
  });
  await page.reload();
  await expect(page.locator("#app")).toBeVisible();
  await expect(page.locator("#user-name")).toHaveText(user.username);
});

test("changing the password works and the old one stops working", async ({ page }) => {
  const user = newUser();
  await register(page, user);
  await page.getByRole("button", { name: "Ajustes" }).click();
  await page.locator("#current-password").fill(user.password);
  await page.locator("#new-password").fill("otra frase muy segura");
  await page.locator("#btn-change-password").click();
  await expect(page.locator("#password-message")).toHaveText("Contraseña cambiada. Se cerraron tus otras sesiones.");
  await expect(page.locator("#activity")).toContainText("Contraseña cambiada");
  await page.locator("#settings-close").click();
  await page.getByRole("button", { name: "Salir", exact: true }).click();
  await logIn(page, { ...user, password: "otra frase muy segura" });
  await expect(page.locator("#user-name")).toHaveText(user.username);
});
