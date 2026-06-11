/**
 * /api/health — Liveness/readiness probe for the platform (Railway healthcheck).
 *
 * Cheap and dependency-free: returns 200 with a small JSON body. It reports
 * which data backend the server is configured for (Postgres when the Supabase
 * service-role key is present, otherwise local SQLite) so a bad/missing env on
 * a deploy is visible at a glance without exposing any secret values.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const postgres =
    !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

  return NextResponse.json({
    status: "ok",
    service: "concilium",
    dataBackend: postgres ? "supabase-postgres" : "sqlite",
    supabaseConfigured: postgres,
    time: new Date().toISOString(),
  });
}
