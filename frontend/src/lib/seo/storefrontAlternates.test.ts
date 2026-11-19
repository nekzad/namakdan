/** @jest-environment node */

import { buildStorefrontLanguageAlternates } from "./storefrontAlternates";

describe("buildStorefrontLanguageAlternates", () => {
  it("emits ?lang= entries per language plus a lang-less x-default", () => {
    const languages = buildStorefrontLanguageAlternates(
      "https://example.test",
      "aurora",
      ["en", "es", "es-AR"],
    );
    expect(languages).toEqual({
      en: "https://example.test/b/aurora?lang=en",
      es: "https://example.test/es/b/aurora",
      "es-AR": "https://example.test/es-ar/b/aurora",
      "x-default": "https://example.test/b/aurora",
    });
  });

  it("returns undefined when there are no languages (or no base URL)", () => {
    expect(
      buildStorefrontLanguageAlternates("https://example.test", "aurora", []),
    ).toBeUndefined();
    expect(
      buildStorefrontLanguageAlternates("", "aurora", ["en"]),
    ).toBeUndefined();
  });

  it("filters empty language codes", () => {
    const languages = buildStorefrontLanguageAlternates(
      "https://example.test",
      "aurora",
      ["en", ""],
    );
    expect(Object.keys(languages!)).toEqual(["en", "x-default"]);
  });
});
