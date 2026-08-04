import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

export function claudeDesktopConfigPath(
  platform: NodeJS.Platform,
  env: Record<string, string | undefined>,
  home: string,
): string {
  if (platform === "win32") {
    const appData = env.APPDATA ?? join(home, "AppData", "Roaming");
    return join(appData, "Claude", "claude_desktop_config.json");
  }
  if (platform === "darwin") {
    return join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json");
  }
  const configHome = env.XDG_CONFIG_HOME ?? join(home, ".config");
  return join(configHome, "Claude", "claude_desktop_config.json");
}

export async function runSetup(
  platform: NodeJS.Platform = process.platform,
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const path = claudeDesktopConfigPath(platform, env, homedir());
  const config = JSON.parse(readFileSync(path, "utf8"));

  const rl = createInterface({ input: stdin, output: stdout });
  const apiKey = await rl.question("Contractbook API key: ");
  rl.close();

  config.mcpServers ??= {};
  config.mcpServers.contractbook = {
    command: "npx",
    args: ["-y", `@contractbook/mcp@${__VERSION__}`],
    env: { CONTRACTBOOK_API_KEY: apiKey },
  };

  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
  console.error(`Added "contractbook" to ${path}. Restart Claude Desktop.`);
}
