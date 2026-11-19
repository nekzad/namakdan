import { metadata } from "./layout";

describe("dashboard metadata", () => {
  it("owns title, OG url, and noindex instead of leaking homepage OG", () => {
    expect(metadata.title).toBe("Dashboard — Namakdan");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(String(metadata.openGraph?.url)).toBe("https://example.test/dashboard");
    expect(metadata.openGraph?.title).toBe(metadata.title);
    expect(String(metadata.openGraph?.url)).not.toBe("https://example.test");
  });
});
