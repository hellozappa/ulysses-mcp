import { describe, it, expect } from "@jest/globals";
import { createExtensionHandler } from "./extended-tools.js";

describe("current-sheet detection without Shortcuts", () => {
  it("reports unavailable without API/body reads, even for a stale authenticated request", async () => {
    let calls = 0;
    const handle = createExtensionHandler(async () => { calls++; throw new Error("Must not call API"); });
    for (const args of [{}, { access_token: "test", text: true }]) {
      expect(await handle("ulysses_get_current_sheet", args)).toMatchObject({
        identifier: null, source: null, status: "unavailable", reason: expect.stringContaining("Shortcuts must not be launched"),
      });
    }
    expect(calls).toBe(0);
    expect(await handle("ulysses_get_capabilities", {})).toMatchObject({ current_sheet: { status: "unavailable" } });
  });
});
