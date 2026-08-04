import { describe, expect, it } from "vitest";

import { claudeDesktopConfigPath } from "../src/setup.js";

describe("claudeDesktopConfigPath", () => {
  it("resolves the macOS path", () => {
    const path = claudeDesktopConfigPath("darwin", {}, "/Users/alice");
    expect(path).toBe("/Users/alice/Library/Application Support/Claude/claude_desktop_config.json");
  });

  it("resolves the Windows path from APPDATA", () => {
    const path = claudeDesktopConfigPath(
      "win32",
      { APPDATA: "C:\\Users\\alice\\AppData\\Roaming" },
      "C:\\Users\\alice",
    );
    expect(path).toContain("Claude");
    expect(path).toContain("claude_desktop_config.json");
    expect(path).toContain("Roaming");
  });

  it("resolves the Linux path honoring XDG_CONFIG_HOME", () => {
    const path = claudeDesktopConfigPath(
      "linux",
      { XDG_CONFIG_HOME: "/home/alice/.cfg" },
      "/home/alice",
    );
    expect(path).toBe("/home/alice/.cfg/Claude/claude_desktop_config.json");
  });

  it("falls back to ~/.config on Linux", () => {
    const path = claudeDesktopConfigPath("linux", {}, "/home/alice");
    expect(path).toBe("/home/alice/.config/Claude/claude_desktop_config.json");
  });
});
