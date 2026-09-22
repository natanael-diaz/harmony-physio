import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns 200 with status ok and correct service name", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data.service).toBe("harmony-physio-web");
  });
});
