import { ContractbookClient } from "../../src/contractbook/client.js";

export function makeClient(fetchImpl: typeof fetch) {
  return new ContractbookClient({
    baseUrl: "http://test",
    apiKey: "test-key",
    fetchImpl,
  });
}
