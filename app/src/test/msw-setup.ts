import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./msw-server";

beforeAll(() => {
  process.env.LPAGENT_API_KEY = "test-key";
  process.env.LPAGENT_BASE_URL = "https://api.lpagent.io";
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => server.resetHandlers());
afterAll(() => server.close());
