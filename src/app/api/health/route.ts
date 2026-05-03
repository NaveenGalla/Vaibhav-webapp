import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateServerEnv } from "@/lib/env";

export async function GET() {
  const env = validateServerEnv();
  const startedAt = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json({
      ok: false,
      status: "database_unavailable",
      env,
      latencyMs: Date.now() - startedAt,
    }, { status: 503 });
  }

  return NextResponse.json({
    ok: env.ok,
    status: env.ok ? "ready" : "env_missing",
    env,
    latencyMs: Date.now() - startedAt,
  }, { status: env.ok ? 200 : 500 });
}
