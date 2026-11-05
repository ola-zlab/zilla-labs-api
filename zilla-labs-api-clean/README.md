# Zilla Labs API — clean authentication foundation

This is a fresh Cloudflare Worker backend for Zilla Labs. It uses **Better Auth + Cloudflare D1**. It does not modify the separate public website Worker.

## What's included

- Better Auth email/password sign-up and sign-in.
- User/admin roles from Better Auth's admin plugin. New accounts receive `user`; ordinary users cannot promote themselves.
- D1 database binding named `DB`.
- Exact trusted website origin; no wildcard credentialed CORS.
- Built-in Better Auth rate limiting.
- A non-sensitive database health route: `GET /api/health/db`.
- A one-time, secret-protected route to run Better Auth's own D1 migrations: `POST /api/setup/migrate`.
- No mock records, fake UI, customer-data endpoints, or embedded secrets.

## Before deployment

1. In `wrangler.jsonc`, replace the D1 `database_name` and `database_id` placeholders with the **existing** D1 database's real values from Cloudflare. Do not create a second database by accident.
2. Confirm `WEBSITE_ORIGIN` is the exact public origin of your current website. It is currently set to `https://zillalab.zillalabola.workers.dev` based on the URL supplied earlier.
3. In the Cloudflare Worker named `zilla-labs-api`, add these as **secrets**, not ordinary vars:
   - `BETTER_AUTH_SECRET`: a random secret of at least 32 characters.
   - `BETTER_AUTH_URL`: the final HTTPS URL of this API Worker.
   - `AUTH_MIGRATION_SECRET`: a different long random one-time secret.
4. Keep this API Worker separate from the existing static website Worker. Do not replace the website's Worker or its D1 binding.

## Install and deploy

```bash
npm install
npm run check
npx wrangler deploy
```

After deployment, call the migration endpoint once:

```bash
curl -X POST "https://YOUR-API-WORKER-URL/api/setup/migrate" \
  -H "Authorization: Bearer YOUR_AUTH_MIGRATION_SECRET"
```

Then remove `AUTH_MIGRATION_SECRET` from the Worker secrets. Verify the database:

```bash
curl "https://YOUR-API-WORKER-URL/api/health/db"
```

Expected response:

```json
{"project":"ZILLA LABS","api":"online","database":"connected"}
```

## Auth endpoints

Better Auth serves its standard routes under `/api/auth/*`, including email sign-up, sign-in, sign-out, and session retrieval. Use the Better Auth client in the website; do not build custom password storage.

Public registration is currently enabled by `ALLOW_SIGNUP: "true"`. Set it to `"false"` to stop new registrations without disabling sign-in.

## First administrator

1. Register your own account through the website's auth client after deployment and migration.
2. In the Cloudflare D1 console, inspect the `user` table and verify your email.
3. Promote only your own account with this SQL, substituting your own email:

```sql
UPDATE "user" SET "role" = 'admin' WHERE "email" = 'YOUR-EMAIL';
```

4. Verify exactly one intended account has the `admin` role. Never expose this SQL operation through a public endpoint.

## Important next build stage

This repository currently provides authentication only. It does **not** yet implement enquiries, project workspaces, customer messages, file attachments, payment records, or their admin dashboard. Those should be added as separate D1 migrations and authenticated API routes after the auth deployment is verified.

## Security notes

- Never commit `.dev.vars`, tokens, auth secrets, API keys, production data, or client enquiries.
- Since this repository is public, every committed source file is readable by anyone. Keep secrets in Cloudflare Worker secrets.
- Do not use a client-side role or hidden button as an authorization check. Every future private API route must verify the Better Auth session and enforce the role on the server.
- Email verification and password-reset email delivery are not enabled in this first foundation because no email delivery provider has been configured yet. Configure a trusted email sender before relying on account recovery or treating email as verified.
