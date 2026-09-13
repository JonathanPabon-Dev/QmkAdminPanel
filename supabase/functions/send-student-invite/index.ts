// supabase/functions/send-student-invite/index.ts
// send-student-invite: single-use-proof-gated invite email (PR2).
//
// The student proves possession of their current password via
// register_student_email (PR1 RPC), which inserts a pending student_invites
// row and returns its `proof`. This endpoint consumes that proof exactly once:
//   1. validate the proof against the pending invite row (used_at/revoked_at
//      null, proof_used_at null, not expired)
//   2. create (or fetch) the auth user for the invite email
//   3. link invite.auth_user_id so accept_student_invite can match auth.uid()
//   4. send the invite email through Resend (REST)
//   5. mark proof_used_at only after a successful send (retryable otherwise)
//
// This function runs with verify_jwt DISABLED: the single-use proof is the
// gate, and an anon JWT is meaningless next to service-role lookups.
//
// Error envelope: { ok: false, code: string } with codes INVALID_PROOF,
// PROOF_USED, INVITE_EXPIRED, GMAIL_ONLY, EMAIL_SEND_FAILED, INTERNAL.

import { createClient } from "@supabase/supabase-js";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GMAIL_SUFFIX = "@gmail.com";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** JSON response with CORS headers merged in. */
function json(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...extraHeaders },
  });
}

/** Error envelope: { ok: false, code } at the given HTTP status. */
function error(code: string, status: number): Response {
  return json({ ok: false, code }, status);
}

/** Mask the local part of an email for the success response. */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

/**
 * GoTrue duplicate-email detection for admin.createUser. supabase-js exposes
 * the code field inconsistently across versions, so the message is checked
 * too. Anything else is a real failure and maps to INTERNAL by the caller.
 */
function isDuplicateEmailError(
  err: { code?: string; status?: number; message?: string } | null,
): boolean {
  if (!err) return false;
  if (err.code === "email_exists" || err.code === "user_already_exists") {
    return true;
  }
  return /email_exists|already been registered|already registered|user already exists/i
    .test(err.message ?? "");
}

/**
 * The portal is a Vite app deployed under the /QmkAdminPanel/ base path
 * (vite.config.js base). The link must carry the hash the existing routing
 * already reads (App.jsx: window.location.hash.includes("type=invite")):
 *   {origin}/QmkAdminPanel/#type=invite&invite_token=<token>
 */
function buildInviteUrl(req: Request, token: string): string | null {
  const origin = Deno.env.get("PORTAL_URL") ?? req.headers.get("origin");
  if (!origin) {
    return null;
  }
  return `${origin.replace(/\/+$/, "")}/QmkAdminPanel/#type=invite&invite_token=${token}`;
}

/** Spanish, neutral, professional email body for the student invite. */
function buildInviteHtml(email: string, inviteUrl: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
</head>
<body style="font-family: Arial, Helvetica, sans-serif; color: #1e293b; line-height: 1.6;">
  <h2>Invitación para ingresar con Google</h2>
  <p>Hola,</p>
  <p>
    Para ingresar al panel con tu cuenta, abre el siguiente enlace y elige
    <strong>Continuar con Google</strong> usando tu correo de Gmail
    (${email}).
  </p>
  <p><a href="${inviteUrl}">Abrir panel e ingresar con Google</a></p>
  <p>
    Si el enlace no funciona, copia y pega esta dirección en tu navegador:<br />
    ${inviteUrl}
  </p>
  <p>
    El enlace es de un solo uso y caduca a los 7 días. Si ya lo usaste o no
    puedes completar el ingreso, solicita un nuevo enlace desde el portal del
    estudiante.
  </p>
</body>
</html>`;
}

serve(async (req) => {
  // Preflight for browser invocations (supabase-js sends these headers).
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return error("INVALID_PROOF", 405);
  }

  // -- Environment (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected
  //    automatically by the platform; only Resend needs explicit secrets).
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return error("INTERNAL", 500);
  }
  if (!resendApiKey) {
    return error("INTERNAL", 500);
  }

  // -- Parse and shape-check the body before touching the database.
  let proof: unknown;
  try {
    const body = await req.json();
    proof = body?.proof;
  } catch {
    return error("INVALID_PROOF", 400);
  }
  if (typeof proof !== "string" || !UUID_RE.test(proof)) {
    return error("INVALID_PROOF", 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // -- 1. Read the pending invite row referenced by the proof.
  const { data: invite, error: readErr } = await supabase
    .from("student_invites")
    .select(
      "token, student_id, email, auth_user_id, expires_at, used_at, revoked_at, proof_used_at",
    )
    .eq("proof", proof)
    .maybeSingle();

  if (readErr) {
    return error("INTERNAL", 500);
  }
  if (!invite) {
    return error("INVALID_PROOF", 404);
  }
  if (invite.proof_used_at) {
    return error("PROOF_USED", 409);
  }
  if (invite.used_at || invite.revoked_at) {
    return error("INVALID_PROOF", 404);
  }
  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    return error("INVITE_EXPIRED", 410);
  }

  // -- 2. Defense in depth: register_student_email already enforced a
  //    lowercase Gmail address (PR1 normalizes with lower(btrim())); this
  //    check fails loudly if that invariant is ever broken.
  const email = invite.email;
  if (!email.toLowerCase().endsWith(GMAIL_SUFFIX)) {
    return error("GMAIL_ONLY", 400);
  }

  // -- 3. Create (or fetch) the auth user for this email. The generated
  //    password is never used: the student logs in via Google and the invite
  //    page links the session. PR1 stores emails lowercase; keep it that way.
  const created = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    // Never used: the student logs in via Google. 32 hex chars stay well
    // inside GoTrue's password length policy.
    password: crypto.randomUUID().replace(/-/g, ""),
    user_metadata: { role: "student" },
  });

  let authUserId: string;
  if (created.error) {
    if (!isDuplicateEmailError(created.error)) {
      console.error(
        "send-student-invite: createUser failed",
        created.error.status ?? "",
        created.error.message,
      );
      return error("INTERNAL", 500);
    }
    // Duplicate email (race with the register call or a previous partial
    // attempt): fetch the existing user. getUserByEmail does not exist in
    // supabase-js v2, so listUsers + exact email match is the lookup used.
    const { data: users, error: listErr } = await supabase.auth.admin
      .listUsers({ page: 1, perPage: 1000 });
    if (listErr) {
      return error("INTERNAL", 500);
    }
    const existing = users.users.find((u) => u.email === email);
    if (!existing) {
      console.error(
        "send-student-invite: email_exists but user not found in listUsers",
        email,
      );
      return error("INTERNAL", 500);
    }
    authUserId = existing.id;
  } else if (!created.data.user) {
    return error("INTERNAL", 500);
  } else {
    authUserId = created.data.user.id;
  }

  // -- 4. Link the invite to the auth user: a single UPDATE guarded by
  //    auth_user_id IS NULL stays atomic; 0 affected rows means a concurrent
  //    link already happened (must be the same user, else something is wrong).
  const { data: linked, error: linkErr } = await supabase
    .from("student_invites")
    .update({ auth_user_id: authUserId })
    .eq("token", invite.token)
    .is("auth_user_id", null)
    .select("token");

  if (linkErr) {
    return error("INTERNAL", 500);
  }
  if (!linked || linked.length === 0) {
    const { data: reloaded, error: reloadErr } = await supabase
      .from("student_invites")
      .select("auth_user_id")
      .eq("token", invite.token)
      .maybeSingle();
    if (reloadErr || !reloaded || reloaded.auth_user_id !== authUserId) {
      return error("INTERNAL", 500);
    }
  }

  // -- 5. Send the invite email through the Resend REST API.
  const from = Deno.env.get("SEND_FROM") ?? "onboarding@resend.dev";
  const inviteUrl = buildInviteUrl(req, invite.token);
  if (!inviteUrl) {
    console.error(
      "send-student-invite: PORTAL_URL unset and no Origin header on request",
    );
    return error("INTERNAL", 500);
  }

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Invitación para ingresar con Google",
      html: buildInviteHtml(email, inviteUrl),
    }),
  });

  if (!resendRes.ok) {
    // Leave the proof un-used so the portal can retry.
    console.error(
      "send-student-invite: resend failed",
      resendRes.status,
      await resendRes.text(),
    );
    return error("EMAIL_SEND_FAILED", 502);
  }

  // -- 6. Consume the proof atomically, and only after a successful send.
  const { data: consumed, error: consumeErr } = await supabase
    .from("student_invites")
    .update({ proof_used_at: new Date().toISOString() })
    .eq("proof", proof)
    .is("proof_used_at", null)
    .select("token");

  if (consumeErr) {
    return error("INTERNAL", 500);
  }
  if (!consumed || consumed.length === 0) {
    // Race: the proof was consumed between our read and this update. The
    // email already went out, so report the single-use violation honestly.
    return error("PROOF_USED", 409);
  }

  return json({ ok: true, to: maskEmail(email) });
});