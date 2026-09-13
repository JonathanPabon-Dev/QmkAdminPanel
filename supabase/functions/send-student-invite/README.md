# send-student-invite

Supabase Edge Function that sends a student their Google sign-in invite email
via Resend. This is PR2 of the *student-google-auth-and-roles* change: it is
the server boundary that turns a successful `register_student_email` call
(which returns a single-use `proof`) into a real emailed invite.

## Why `verify_jwt` is DISABLED

This function **must be deployed with `--no-verify-jwt`** (or
`verify_jwt = false` in `config.toml`). It is not protected by a JWT:

- The gate is the single-use `proof` the student obtained by proving their
  current password through the security-definer RPC `register_student_email`.
- All database work runs with the service-role key, so the anon JWT the
  platform would verify carries no authority; enforcing it would only block
  browser callers (anon token) for no security gain.
- The `proof` is consumed atomically (`proof_used_at` updated in a guarded
  `UPDATE ... WHERE proof_used_at IS NULL`) immediately after a successful
  send, so replaying the request does not resend the email.

If you later add an administrative (non-proof) path to this function, that
path needs its own authentication (e.g. a session JWT plus a role check) —
do not rely on `verify_jwt` alone.

## Flow

1. **PR1 portal**: student logs in with code + password, reaches the Gmail
   registration screen, submits their Gmail address.
2. **PR1 RPC**: `register_student_email` proves the password, normalizes the
   email to lowercase, validates it is a Gmail address, revokes prior pending
   invites and inserts a new `student_invites` row. It returns
   `{ ok, email, proof, expires_at }`.
3. **This function** (`POST` with `{ "proof": "<uuid>" }`):
   - validates the proof against the pending invite row
     (`used_at`/`revoked_at`/`proof_used_at` all null, `expires_at` in the
     future),
   - creates the auth user (`email_confirm: true`, random unused password,
     `user_metadata.role = 'student'`) — if the email already exists it
     looks the existing user up via `admin.listUsers` and links that one,
   - links the invite to that user:
     `update student_invites set auth_user_id = <uid> where token = <token> and auth_user_id is null`,
   - sends the email through Resend,
   - finally marks `proof_used_at = now()` — and only on success, so a
     failed send stays retryable.
4. **PR3 portal**: the student opens the link, signs in with Google; the
   invite page claims the token with `accept_student_invite`, which verifies
   `auth.uid() = invite.auth_user_id`.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `RESEND_API_KEY` | **Yes** | Resend API key (`supabase secrets set RESEND_API_KEY ...`). Missing key → `500 { ok:false, code:"INTERNAL" }`. |
| `SEND_FROM` | No | Sender address, e.g. `alerts@yourdomain.com`. Defaults to Resend's test sender `onboarding@resend.dev` (only works with your Resend account email until a verified domain is added). |
| `PORTAL_URL` | Recommended | Origin of the portal deployment, e.g. `https://panel.misitio.com`. The email link is built as `<PORTAL_URL>/QmkAdminPanel/#type=invite&invite_token=<token>` (the `/QmkAdminPanel/` base matches `vite.config.js`). When unset, the request `Origin` header is used as fallback; if neither exists the function returns `500 INTERNAL` because the email would have no usable link. |
| `SUPABASE_URL` | Injected | Provided automatically by the platform. Do not set manually. |
| `SUPABASE_SERVICE_ROLE_KEY` | Injected | Provided automatically by the platform. Do not set manually. |

## Deployment

```bash
# 1. Store the secret (one-time)
supabase secrets set RESEND_API_KEY=re_xxxxxxxx

# 2. Optional: custom sender + portal origin
supabase secrets set SEND_FROM=alerts@yourdomain.com
supabase secrets set PORTAL_URL=https://panel.misitio.com

# 3. Deploy WITHOUT JWT verification — required for this function
supabase functions deploy send-student-invite --project-ref dwxjzwoeokudtiihdkut --no-verify-jwt
```

(`--project-ref` is optional when the CLI is linked to the project; it is
listed here because the proof gate replaces JWT verification and reviewers
must see the flag explicitly.)

## Local development

```bash
supabase functions serve send-student-invite --env-file ./supabase/.env.local --no-verify-jwt
```

Requires the local Supabase stack (Docker). `.env.local` must contain
`RESEND_API_KEY` (and optionally `SEND_FROM` / `PORTAL_URL`).

## Request / response contract

`POST https://<ref>.supabase.co/functions/v1/send-student-invite`

Request body:

```json
{ "proof": "a583d2e4-...-uuid-from-register_student_email" }
```

Response (JSON, always with CORS headers):

| HTTP status | Body | Meaning |
|---|---|---|
| `200` | `{ "ok": true, "to": "em***@gmail.com" }` | Email sent; proof consumed. `to` is the masked recipient. |
| `400` | `{ "ok": false, "code": "INVALID_PROOF" }` | Malformed body or non-UUID proof. |
| `400` | `{ "ok": false, "code": "GMAIL_ONLY" }` | Invite email is not a Gmail address (defense in depth; the RPC already enforces this). |
| `404` | `{ "ok": false, "code": "INVALID_PROOF" }` | No invite row for this proof, or the invite is no longer pending (used/revoked). |
| `405` | `{ "ok": false, "code": "INVALID_PROOF" }` | Non-POST/OPTIONS method. |
| `409` | `{ "ok": false, "code": "PROOF_USED" }` | Proof already consumed (or consumed concurrently). |
| `410` | `{ "ok": false, "code": "INVITE_EXPIRED" }` | Invite past `expires_at` (7 days). |
| `502` | `{ "ok": false, "code": "EMAIL_SEND_FAILED" }` | Resend rejected the email. **Proof NOT consumed** — the portal can retry. |
| `500` | `{ "ok": false, "code": "INTERNAL" }` | Missing env, database/auth error, or inconsistent linkage. |

Preflight: `OPTIONS` → `200` with
`Access-Control-Allow-Origin: *` and
`Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`.

## Atomicity notes

- The auth-user creation and the invite linkage happen **before** the send; a
  failed send leaves the auth user created and the invite linked, but the
  proof un-used. A retry then takes the duplicate-email path (lookup + same
  user id) — the link update is a no-op because of the `auth_user_id IS NULL`
  guard, and the send + proof consumption proceed normally.
- The proof is marked `proof_used_at` in a single guarded UPDATE, which makes
  concurrent replays safe: exactly one request can consume the proof, and it
  is the one that successfully sent the email.

## Error codes

`INVALID_PROOF`, `PROOF_USED`, `INVITE_EXPIRED`, `GMAIL_ONLY`,
`EMAIL_SEND_FAILED`, `INTERNAL`.