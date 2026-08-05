import { describe, expect, it } from "vitest";

import { readConfig } from "../src/config.js";

describe("readConfig", () => {
  it("throws when CONTRACTBOOK_API_KEY is missing", () => {
    expect(() => readConfig({})).toThrow("CONTRACTBOOK_API_KEY");
  });

  it("throws when CONTRACTBOOK_API_KEY is empty", () => {
    expect(() => readConfig({ CONTRACTBOOK_API_KEY: "" })).toThrow("CONTRACTBOOK_API_KEY");
  });

  it("applies defaults", () => {
    const config = readConfig({ CONTRACTBOOK_API_KEY: "key" });
    expect(config.apiKey).toBe("key");
    expect(config.baseUrl).toBe("https://api.contractbook.com");
    expect(config.appUrl).toBe("https://app.contractbook.com");
  });

  it("honors the base URL override", () => {
    const config = readConfig({
      CONTRACTBOOK_API_KEY: "key",
      CONTRACTBOOK_BASE_URL: "https://api-staging.contractbook.com",
    });
    expect(config.baseUrl).toBe("https://api-staging.contractbook.com");
  });

  it("honors the app URL override", () => {
    const config = readConfig({
      CONTRACTBOOK_API_KEY: "key",
      CONTRACTBOOK_APP_URL: "https://app-staging.contractbook.com",
    });
    expect(config.appUrl).toBe("https://app-staging.contractbook.com");
  });

  it("strips trailing slashes from the base URL", () => {
    const config = readConfig({
      CONTRACTBOOK_API_KEY: "key",
      CONTRACTBOOK_BASE_URL: "https://api.contractbook.com/",
    });
    expect(config.baseUrl).toBe("https://api.contractbook.com");
  });

  it("strips trailing slashes from the app URL", () => {
    const config = readConfig({
      CONTRACTBOOK_API_KEY: "key",
      CONTRACTBOOK_APP_URL: "https://app.contractbook.com/",
    });
    expect(config.appUrl).toBe("https://app.contractbook.com");
  });
});
