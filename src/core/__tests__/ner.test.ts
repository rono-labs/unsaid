import { describe, expect, it } from "vitest";
import { chunkText, tokensToFindings, type TokenOut } from "../ner";
import tokens from "./ner-tokens.json";

const TEXT = "Hello, my name is Elena Petrova and I live in Atlanta. I emailed Northwind Outfitters.";

describe("tokensToFindings", () => {
  it("merges word pieces into entities with offsets", () => {
    const found = tokensToFindings(TEXT, 0, tokens as TokenOut[]);
    const byType = Object.fromEntries(found.map((f) => [f.type, f.value]));
    expect(byType.PERSON).toBe("Elena Petrova");
    expect(byType.LOCATION).toBe("Atlanta");
    expect(byType.ORG).toBe("Northwind Outfitters");
    for (const f of found) expect(TEXT.slice(f.start, f.end)).toBe(f.value);
  });

  it("applies the chunk offset", () => {
    const [f] = tokensToFindings(TEXT, 100, tokens as TokenOut[]);
    expect(f.start).toBeGreaterThanOrEqual(100);
  });
});

describe("chunkText", () => {
  it("covers the whole text without overlap", () => {
    const text = Array.from({ length: 200 }, (_, i) => `line ${i} with some words`).join("\n");
    const chunks = chunkText(text, 300);
    expect(chunks.map((c) => c.text).join("")).toBe(text);
    for (const c of chunks) expect(text.slice(c.offset, c.offset + c.text.length)).toBe(c.text);
  });
});
