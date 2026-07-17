export interface Config {
  apiKey: string;
  baseUrl: string;
}

const DEFAULT_BASE_URL = "https://api.contractbook.com";

export function readConfig(env: Record<string, string | undefined>): Config {
  const apiKey = env.CONTRACTBOOK_API_KEY;
  if (!apiKey) {
    throw new Error("Missing required environment variable CONTRACTBOOK_API_KEY");
  }

  const baseUrl = (env.CONTRACTBOOK_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");

  return { apiKey, baseUrl };
}
