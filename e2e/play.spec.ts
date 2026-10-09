import { expect, test } from "@playwright/test";
import { createProject, newUser, register, screenPoint } from "./helpers";

test("a run is played with physics, finished and learned from", async ({ page }) => {
  await register(page, newUser());
  await createProject(page, "Partida");
  await page.getByRole("button", { name: /^Jugador/ }).click();
  const point = await screenPoint(page, 96, 480);
  await page.mouse.click(point.x, point.y);

  await page.getByRole("button", { name: "▶ Jugar" }).click();
  await expect(page.locator("#hud")).toBeVisible();
  await expect(page.locator(".panel-left")).toBeHidden();
  await expect(page.locator("#hud-hearts")).toHaveText("♥♥♥");

  // Walk for a while: time passes and the camera follows the player.
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(1500);
  await page.keyboard.up("ArrowRight");
  await expect(page.locator("#hud-time")).not.toHaveText("0:00");

  await page.getByRole("button", { name: "■ Salir" }).click();
  const dialog = page.locator("#result-dialog");
  await expect(dialog).toBeVisible();
  await expect(page.locator("#result-title")).toHaveText(/Partida abandonada|Has perdido|¡Nivel superado!/);
  await expect(dialog).toContainText("La IA aprendió de esta partida");

  await page.getByRole("button", { name: "Volver al editor" }).click();
  await expect(page.locator("#hud")).toBeHidden();
  await expect(page.locator("#stats")).toContainText("1Partidas");
  await expect(page.locator("#ai-model")).toContainText("Aprendió de 1 partida");
});
