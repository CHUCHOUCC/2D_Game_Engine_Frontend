import { describe, expect, it } from "vitest";
import { attemptsMessage, checkConfirmation, checkEmail, checkNewPassword, checkUsername, passwordRules } from "./validation";

describe("username", () => {
  it("accepts letters, digits and underscores", () => {
    expect(checkUsername("nicky_dev").state).toBe("ok");
  });

  it("explains each problem", () => {
    expect(checkUsername("").message).toBe("Escribe un nombre de usuario.");
    expect(checkUsername("ab").message).toContain("al menos 3");
    expect(checkUsername("x".repeat(21)).message).toContain("máximo 20");
    expect(checkUsername("con espacio").message).toContain("espacios");
    expect(checkUsername("ñandú").state).toBe("bad");
  });
});

describe("email", () => {
  it("accepts a normal address", () => {
    expect(checkEmail(" nicky@pixelforge.co ").state).toBe("ok");
  });

  it("says what is missing", () => {
    expect(checkEmail("nicky").message).toContain("Falta la @");
    expect(checkEmail("@pixelforge.co").message).toContain("antes de la @");
    expect(checkEmail("nicky@").message).toContain("después de la @");
    expect(checkEmail("nicky@pixelforge").message).toContain("terminación");
    expect(checkEmail("a@b@c.com").message).toContain("una @");
    expect(checkEmail("ni cky@x.com").message).toContain("espacios");
  });
});

describe("password", () => {
  it("ticks the checklist rules", () => {
    expect(passwordRules("forja2026")).toEqual({ length: true, mix: true, common: true, personal: true });
    expect(passwordRules("abc").length).toBe(false);
    expect(passwordRules("abcdefgh").mix).toBe(false);
    expect(passwordRules("password123").common).toBe(false);
    expect(passwordRules("nicky2026x", "nicky@x.com").personal).toBe(false);
  });

  it("asks to mix letters with something else", () => {
    expect(checkNewPassword("soloLetras").state).toBe("bad");
    expect(checkNewPassword("forja2026").state).toBe("ok");
  });

  it("checks that the confirmation matches", () => {
    expect(checkConfirmation("forja2026", "forja2025").state).toBe("bad");
    expect(checkConfirmation("forja2026", "forja2026").state).toBe("ok");
    expect(checkConfirmation("forja2026", "").message).toBe("Repite la contraseña.");
  });
});

describe("attempts banner", () => {
  it("counts down to the lockout", () => {
    expect(attemptsMessage(null)).toBe("");
    expect(attemptsMessage(3)).toContain("3 intentos");
    expect(attemptsMessage(1)).toContain("1 intento ");
    expect(attemptsMessage(0)).toContain("bloqueada");
  });
});
