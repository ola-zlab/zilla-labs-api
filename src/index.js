import { getMigrations } from "better-auth/db/migration";
import { createAuth } from "./auth.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health/db" && request.method === "GET") {
      try {
        await env.DB.prepare("SELECT 1 AS ok").first();
        return json({ project: "ZILLA LABS", api: "online", database: "connected" });
      } catch (error) {
        console.error("D1 health check failed", error);
        return json({ project: "ZILLA LABS", api: "online", database: "unavailable" }, 503);
      }
    }

    // Run Better Auth's own schema migrations once, using a temporary secret.
    // Remove AUTH_MIGRATION_SECRET from Worker secrets after the first success.
    if (url.pathname === "/api/setup/migrate" && request.method === "POST") {
      const expected = env.AUTH_MIGRATION_SECRET;
      const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
      if (!expected || !safeEqual(supplied, expected)) {
        return json({ error: "Unauthorized" }, 401);
      }
      try {
        const auth = createAuth(env);
        const { runMigrations } = await getMigrations(auth.options);
        await runMigrations();
        return json({ ok: true, message: "Better Auth D1 migrations completed" });
      } catch (error) {
        console.error("Auth migration failed", error);
        return json({ error: "Migration failed. Check Worker logs." }, 500);
      }
    }

    if (url.pathname.startsWith("/api/auth/")) {
      try {
        return await createAuth(env).handler(request);
      } catch (error) {
        console.error("Authentication request failed", error);
        return json({ error: "Authentication service unavailable" }, 500);
      }
    }

    return json({ error: "Not found" }, 404);
  }
};
