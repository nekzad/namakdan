import { deriveApiBase } from "../api.js";

describe("deriveApiBase", () => {
  test("maps local dev frontend port to the backend port", () => {
    expect(deriveApiBase("http://localhost:3000")).toBe("http://localhost:8080");
    expect(deriveApiBase("http://127.0.0.1:3000")).toBe("http://localhost:8080");
  });

  test("prefixes the production apex domain with api.", () => {
    expect(deriveApiBase("https://example.test")).toBe("https://api.example.test");
  });

  test("strips a leading www. before prefixing api.", () => {
    expect(deriveApiBase("https://www.example.test")).toBe("https://api.example.test");
  });

  test("leaves an already-api origin untouched", () => {
    expect(deriveApiBase("https://api.example.test")).toBe("https://api.example.test");
  });
});
