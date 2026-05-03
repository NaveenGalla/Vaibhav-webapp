const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3001";

const routes = [
  "/api/health",
  "/login",
];

const failures = [];

for (const route of routes) {
  const url = new URL(route, baseUrl).toString();
  try {
    const res = await fetch(url, { redirect: "manual" });
    if (res.status >= 500) failures.push(`${route}: ${res.status}`);
  } catch (error) {
    failures.push(`${route}: ${error instanceof Error ? error.message : "request failed"}`);
  }
}

if (failures.length > 0) {
  console.error("Smoke check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Smoke check passed for ${baseUrl}`);
