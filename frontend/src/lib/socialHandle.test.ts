import {
  normalize,
  socialProfileUrl,
  type SocialNetwork,
} from "./socialHandle";

describe("normalize(network, raw)", () => {
  describe.each([
    // [network, raw, expectedHandle]
    ["facebook", "namakdan", "namakdan"],
    ["facebook", "@namakdan", "namakdan"],
    ["facebook", "facebook.com/namakdan", "namakdan"],
    ["facebook", "https://facebook.com/namakdan", "namakdan"],
    ["facebook", "https://www.facebook.com/namakdan/", "namakdan"],
    ["instagram", "mycafe", "mycafe"],
    ["instagram", "@mycafe", "mycafe"],
    ["instagram", "instagram.com/mycafe", "mycafe"],
    ["instagram", "https://www.instagram.com/mycafe/", "mycafe"],
    ["twitter", "namakdan", "namakdan"],
    ["twitter", "@namakdan", "namakdan"],
    ["twitter", "https://x.com/namakdan", "namakdan"],
    ["twitter", "https://twitter.com/namakdan/", "namakdan"],
    ["linkedin", "namakdan", "namakdan"],
    ["linkedin", "linkedin.com/company/namakdan", "namakdan"],
    ["linkedin", "https://www.linkedin.com/company/namakdan/", "namakdan"],
    ["youtube", "namakdan", "namakdan"],
    ["youtube", "@namakdan", "namakdan"],
    ["youtube", "https://youtube.com/@namakdan", "namakdan"],
    ["youtube", "https://www.youtube.com/@namakdan/", "namakdan"],
    ["tiktok", "namakdan", "namakdan"],
    ["tiktok", "@namakdan", "namakdan"],
    ["tiktok", "tiktok.com/@namakdan", "namakdan"],
    ["tiktok", "https://www.tiktok.com/@namakdan/", "namakdan"],
  ] as const)("%s %s → %s", (network, raw, expected) => {
    it("returns one canonical handle", () => {
      const result = normalize(network, raw);
      expect(result).toEqual({ ok: true, handle: expected });
    });
  });

  it("returns empty handle for blank input", () => {
    expect(normalize("facebook", "")).toEqual({ ok: true, handle: "" });
    expect(normalize("instagram", "   ")).toEqual({ ok: true, handle: "" });
  });

  it("strips query strings and fragments", () => {
    expect(
      normalize("facebook", "https://www.facebook.com/namakdan?ref=page"),
    ).toEqual({ ok: true, handle: "namakdan" });
    expect(
      normalize("instagram", "https://instagram.com/mycafe#reels"),
    ).toEqual({ ok: true, handle: "mycafe" });
  });

  it("rejects a URL for the wrong network", () => {
    const cases: Array<[SocialNetwork, string]> = [
      ["facebook", "https://instagram.com/namakdan"],
      ["instagram", "https://facebook.com/namakdan"],
      ["twitter", "https://tiktok.com/@namakdan"],
      ["tiktok", "https://www.instagram.com/namakdan"],
      ["linkedin", "https://youtube.com/@namakdan"],
      ["youtube", "https://linkedin.com/company/namakdan"],
    ];
    for (const [network, raw] of cases) {
      const result = normalize(network, raw);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/network|wrong|belong|mismatch|expected/i);
      }
    }
  });

  it("rejects handles that fail the network charset", () => {
    const result = normalize("instagram", "bad handle!!");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/invalid|charset|character/i);
    }
  });

  it("rejects facebook.com bare host with empty path as empty (ok)", () => {
    // Host only with trailing slash → nothing left after strip.
    expect(normalize("facebook", "https://facebook.com/")).toEqual({
      ok: true,
      handle: "",
    });
  });
});

describe("socialProfileUrl", () => {
  it("builds the canonical profile URL from a bare handle", () => {
    expect(socialProfileUrl("instagram", "mycafe")).toBe(
      "https://instagram.com/mycafe",
    );
    expect(socialProfileUrl("facebook", "namakdan")).toBe(
      "https://facebook.com/namakdan",
    );
    expect(socialProfileUrl("twitter", "namakdan")).toBe(
      "https://twitter.com/namakdan",
    );
    expect(socialProfileUrl("linkedin", "namakdan")).toBe(
      "https://linkedin.com/company/namakdan",
    );
    expect(socialProfileUrl("youtube", "namakdan")).toBe(
      "https://youtube.com/@namakdan",
    );
    expect(socialProfileUrl("tiktok", "namakdan")).toBe(
      "https://tiktok.com/@namakdan",
    );
  });

  it("returns empty string for empty handle", () => {
    expect(socialProfileUrl("instagram", "")).toBe("");
  });
});
