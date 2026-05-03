export function validateServerEnv() {
  const missing = [
    !process.env.DATABASE_URL ? "DATABASE_URL" : null,
    !process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET ? "AUTH_SECRET or NEXTAUTH_SECRET" : null,
    !process.env.NEXTAUTH_URL ? "NEXTAUTH_URL" : null,
  ].filter((key): key is string => Boolean(key));
  if (missing.length > 0) {
    return {
      ok: false,
      missing,
      message: `Missing required environment variables: ${missing.join(", ")}`,
    };
  }

  return { ok: true, missing: [] as string[], message: "Environment is ready." };
}
