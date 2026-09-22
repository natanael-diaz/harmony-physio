import { NextResponse } from "next/server";

/**
 * GET /api/health
 *
 * Health-check endpoint for load balancer / uptime monitoring.
 * Returns HTTP 200 with a JSON body so both HTTP-level and content-level
 * checks can be satisfied.
 *
 * Future: extend to include DB connectivity check (ping prisma) once
 * the database is provisioned. Keep response time < 500 ms.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "harmony-physio-web",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
