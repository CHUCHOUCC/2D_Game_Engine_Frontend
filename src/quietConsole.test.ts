import { describe, expect, it } from "vitest";
import { quietConsole } from "./quietConsole";

describe("quiet console", () => {
  it("turns every printing method into a no-op", () => {
    const printed: unknown[] = [];
    const fake = { log: (...a: unknown[]) => printed.push(a), warn: (...a: unknown[]) => printed.push(a), error: (...a: unknown[]) => printed.push(a) } as unknown as Console;
    quietConsole(fake);
    fake.log("secret");
    fake.warn("secret");
    fake.error("secret");
    expect(printed).toEqual([]);
  });
});
