import { describe, expect, it } from "vitest";
import { detect } from "../detect";

const types = (t: string) => detect(t).map((f) => `${f.type}:${f.value}`);

describe("detect", () => {
  it("finds provider keys by format", () => {
    expect(types("token ghp_8fK2mQ9xLr4TzW7bN1cVyP3sD6hJ0aGeU5oR")).toEqual(["GITHUB_TOKEN:ghp_8fK2mQ9xLr4TzW7bN1cVyP3sD6hJ0aGeU5oR"]);
    expect(types("key AKIAZ7Q4MBX2KD9RLW3T")).toEqual(["AWS_ACCESS_KEY:AKIAZ7Q4MBX2KD9RLW3T"]);
  });

  it("masks only the password in a connection string", () => {
    expect(types("postgres://app:s3cr3t-pw@db.internal:5432/x")).toEqual(["PASSWORD:s3cr3t-pw"]);
  });

  it("validates card numbers with Luhn", () => {
    expect(types("card 4539 1488 0343 6467")).toEqual(["CREDIT_CARD:4539 1488 0343 6467"]);
    expect(types("card 4539 1488 0343 6468")).toEqual([]);
  });

  it("ignores common decoys", () => {
    const decoys = [
      "commit 9fceb02d0ae598e95dc970b74767f19372d61af8",
      "id 7149d439-536b-4321-a6fd-aeeb975729fa",
      '"version": "10.2.0.1"',
      "listening on 127.0.0.1:3000",
      "OPENAI_API_KEY=your-api-key-here",
      "STRIPE_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxx",
      "DB_PASSWORD=${DB_PASSWORD}",
      "User-Agent: Chrome/118.0.0.0",
    ];
    for (const d of decoys) expect(types(d), d).toEqual([]);
  });

  it("hides OS usernames in paths, not the path", () => {
    expect(types('File "C:\\Users\\dana\\app.py"')).toEqual(["USERNAME:dana"]);
    expect(types("/home/priya/projects")).toEqual(["USERNAME:priya"]);
  });

  it("supports custom terms", () => {
    expect(detect("Project Bluefin ships", { custom: ["bluefin"] }).map((f) => f.value)).toEqual(["Bluefin"]);
  });
});
