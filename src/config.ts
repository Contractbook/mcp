export interface Config {
  apiKey: string;
  baseUrl: string;
  appUrl: string;
}

const DEFAULT_BASE_URL = "https://api.contractbook.com";
const DEFAULT_APP_URL = "https://app.contractbook.com";

export function readConfig(env: Record<string, string | undefined>): Config {
  const apiKey = env.CONTRACTBOOK_API_KEY;
  if (!apiKey) {
    throw new Error("Missing required environment variable CONTRACTBOOK_API_KEY");
  }

  const baseUrl = (env.CONTRACTBOOK_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const appUrl = (env.CONTRACTBOOK_APP_URL ?? DEFAULT_APP_URL).replace(/\/+$/, "");

  return { apiKey, baseUrl, appUrl };
}
