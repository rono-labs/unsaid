import { describe, expect, it } from "vitest";
import { audit, parseExport } from "../audit";

const key = "ghp_" + "8fK2mQ9xLr4TzW7bN1cVyP3sD6hJ0aGeU5oR";

const gpt = [
  {
    title: "CI failing",
    conversation_id: "a",
    create_time: 1767225600,
    mapping: {
      r: { message: null },
      u1: { message: { author: { role: "user" }, create_time: 1767225600, content: { content_type: "text", parts: [`token ${key}`] } } },
      a1: { message: { author: { role: "assistant" }, create_time: 1767225601, content: { content_type: "text", parts: ["your token ghp_ is wrong"] } } },
    },
  },
  {
    title: "Again",
    conversation_id: "b",
    mapping: { u: { message: { author: { role: "user" }, create_time: 1767312000, content: { parts: [`same ${key} and me@site.dev`] } } } },
  },
];

const claude = [{ uuid: "c1", name: "Help", chat_messages: [{ sender: "human", text: "call me at (404) 555-0187", created_at: "2026-02-01T10:00:00Z" }, { sender: "assistant", text: "ok" }] }];

describe("audit", () => {
  it("reads ChatGPT exports and groups repeated secrets", () => {
    const r = audit(parseExport(gpt));
    expect(r.source).toBe("chatgpt");
    expect(r.messages).toBe(2);
    expect(r.items[0]).toMatchObject({ type: "GITHUB_TOKEN", count: 2, first: 1767225600, last: 1767312000 });
    expect(r.items[0].conversations.map((c) => c.title)).toEqual(["CI failing", "Again"]);
    expect(r.items.map((i) => i.type)).toEqual(["GITHUB_TOKEN", "EMAIL"]);
  });

  it("reads Claude exports and skips assistant messages", () => {
    const r = audit(parseExport(claude));
    expect(r.source).toBe("claude");
    expect(r.items.map((i) => i.type)).toEqual(["PHONE"]);
  });

  it("rejects other JSON", () => {
    expect(() => parseExport({ hello: 1 })).toThrow();
  });
});
