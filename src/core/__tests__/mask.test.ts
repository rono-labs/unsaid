import { describe, expect, it } from "vitest";
import { detect } from "../detect";
import { Vault, mask, restore } from "../mask";

describe("mask and restore", () => {
  const text = "dana@acme.io: ssh 203.0.113.9 failed, then 203.0.113.9 refused key for ops@acme.io";

  it("gives each distinct value one stable placeholder", () => {
    const vault = new Vault();
    const masked = mask(text, detect(text), vault);
    expect(masked).toBe("<EMAIL_1>: ssh <IP_ADDRESS_1> failed, then <IP_ADDRESS_1> refused key for <EMAIL_2>");
    expect(mask("again 203.0.113.9", detect("again 203.0.113.9"), vault)).toBe("again <IP_ADDRESS_1>");
  });

  it("restores placeholders in the formats models tend to write", () => {
    const vault = new Vault();
    mask(text, detect(text), vault);
    const r = restore("Check [IP_ADDRESS_1], `<EMAIL_2>` and EMAIL_1. Ignore <PHONE_9>.", vault);
    expect(r.text).toBe("Check 203.0.113.9, `ops@acme.io` and dana@acme.io. Ignore <PHONE_9>.");
    expect(r.restored).toHaveLength(3);
    expect(r.unknown).toEqual(["PHONE_9"]);
  });

  it("round-trips a vault through serialization", () => {
    const vault = new Vault();
    mask(text, detect(text), vault);
    const copy = new Vault(JSON.parse(JSON.stringify(vault.entries())));
    expect(copy.tagFor("ops@acme.io", "EMAIL")).toBe("EMAIL_2");
    expect(copy.tagFor("new@acme.io", "EMAIL")).toBe("EMAIL_3");
  });
});
