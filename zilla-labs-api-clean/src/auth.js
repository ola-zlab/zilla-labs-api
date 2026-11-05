import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";

/**
 * Create one Better Auth instance for the current Worker request.
 * Cloudflare's D1 binding is passed directly; Better Auth includes a native
 * D1 integration, so no separate SQL client or third-party adapter is used.
 */
export function createAuth(env) {
  if (!env.DB) throw new Error("Missing required Cloudflare D1 binding: DB");
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be set to at least 32 characters");
  }
  if (!env.BETTER_AUTH_URL) {
    throw new Error("BETTER_AUTH_URL must be set to this API Worker HTTPS URL");
  }

  const trustedOrigins = [env.WEBSITE_ORIGIN].filter(Boolean);

  return betterAuth({
    appName: "Zilla Labs",
    database: env.DB,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      disableSignUp: env.ALLOW_SIGNUP === "false",
      minPasswordLength: 10,
      maxPasswordLength: 128
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24
    },
    plugins: [admin({ defaultRole: "user", adminRoles: ["admin"] })],
    rateLimit: { enabled: true },
    telemetry: { enabled: false }
  });
}
