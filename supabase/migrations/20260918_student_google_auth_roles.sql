-- 20260918_student_google_auth_roles.sql
-- Student Google auth + roles (PR1: schema + RPCs + seed).
--   - app_user_role enum; students gain email + auth_user_id (FK auth.users).
--   - user_roles: auth-user -> role mapping. RLS on, zero policies:
--     service-role writes only; reads happen via security-definer RPCs.
--   - student_invites: single-use, time-limited invite rows carrying a
--     student-owned proof for the edge-function flow. RLS on, zero policies.
--   - login_student extended additively (email, auth_linked, invite_pending);
--     must_change_password and every existing field are preserved.
--   - register_student_email / accept_student_invite / get_my_role: new RPCs.
--   - v_students rebuilt (original columns preserved) and security_invoker
--     re-applied because the setting lives on the view and is dropped with it.
--   - Seed: every existing auth.users row becomes an admin.
begin;

-- 1. Role enum + students email / auth linkage columns.
create type app_user_role as enum ('admin', 'teacher', 'student');

alter table public.students add column email text;
alter table public.students add column auth_user_id uuid references auth.users(id) on delete set null;
create unique index students_email_key on public.students(email) where email is not null;

-- 2. user_roles: single source of truth for roles, keyed by auth user id.
create table public.user_roles (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  role app_user_role not null,
  created_at timestamptz not null default now()
);
alter table public.user_roles enable row level security;

-- 3. student_invites: one pending invite per student at most; service-role
--    writes only (RLS on, no policies).
create table public.student_invites (
  token uuid primary key default gen_random_uuid(),
  proof uuid not null unique,
  student_id bigint not null references public.students(id) on delete cascade,
  email text not null,
  auth_user_id uuid references auth.users(id),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  revoked_at timestamptz,
  proof_used_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index student_invites_one_pending
  on public.student_invites(student_id)
  where used_at is null and revoked_at is null;
alter table public.student_invites enable row level security;

-- 4. Helper for v_students.invite_pending: the view runs security_invoker and
--    student_invites has zero policies, so a plain subquery would always be
--    RLS-filtered to false for callers. A security-definer function reads the
--    flag with the definer's privileges instead. Execute is restricted to
--    authenticated (the admin panel); anon must not probe invite states.
create or replace function public.student_invite_pending(p_student_id bigint)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
      from public.student_invites si
     where si.student_id = p_student_id
       and si.used_at is null
       and si.revoked_at is null
  )
$$;

revoke all on function public.student_invite_pending(bigint) from public, anon;
grant execute on function public.student_invite_pending(bigint) to authenticated;

-- 5. login_student: additive fields only. The function is security definer,
--    so the invite_pending subquery sees invites even with RLS on.
create or replace function public.login_student(p_code bigint, p_password text)
returns jsonb
language sql
security definer
set search_path = public, extensions
as $$
  select jsonb_build_object(
           'id', s.id,
           'number_list', s.number_list,
           'first_name', s.first_name,
           'second_name', s.second_name,
           'first_lastname', s.first_lastname,
           'second_lastname', s.second_lastname,
           'grade_level', s.grade_level,
           'course_id', s.course_id,
           'must_change_password', s.password_hash = crypt(s.id::text, s.password_hash),
           'email', s.email,
           'auth_linked', s.auth_user_id is not null,
           'invite_pending', exists(
             select 1
               from public.student_invites si
              where si.student_id = s.id
                and si.used_at is null
                and si.revoked_at is null
           )
         )
    from public.students s
   where s.id = p_code
     and s.password_hash is not null
     and s.password_hash = crypt(p_password, s.password_hash)
$$;

revoke all on function public.login_student(bigint, text) from public;
grant execute on function public.login_student(bigint, text) to anon, authenticated;

-- 6. register_student_email: proves the current password, gates on a Gmail
--    address, stores a normalized (lowercase) email on the student, revokes
--    prior pending invites and returns a single-use proof for the
--    edge-function flow. Every validation failure maps to a reason code.
create or replace function public.register_student_email(
  p_code bigint,
  p_current_password text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_student public.students%rowtype;
  v_email text;
  v_proof uuid;
  v_expires_at timestamptz;
begin
  v_email := lower(btrim(p_email));

  select * into v_student
    from public.students s
   where s.id = p_code;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'STUDENT_NOT_FOUND');
  end if;

  if v_student.password_hash is null
     or p_current_password is null
     or v_student.password_hash <> crypt(p_current_password, v_student.password_hash) then
    return jsonb_build_object('ok', false, 'reason', 'INVALID_PASSWORD');
  end if;

  if v_student.auth_user_id is not null then
    return jsonb_build_object('ok', false, 'reason', 'ALREADY_LINKED');
  end if;

  if v_email is null or v_email not like '%@gmail.com' then
    return jsonb_build_object('ok', false, 'reason', 'GMAIL_ONLY');
  end if;

  if exists (
       select 1
         from public.students s
        where s.email = v_email
          and s.id <> p_code
     ) then
    return jsonb_build_object('ok', false, 'reason', 'EMAIL_TAKEN');
  end if;

  if exists (
       select 1
         from auth.users u
        where u.email = v_email
     ) then
    return jsonb_build_object('ok', false, 'reason', 'EMAIL_IN_USE');
  end if;

  update public.students s
     set email = v_email
   where s.id = p_code;

  update public.student_invites si
     set revoked_at = now()
   where si.student_id = p_code
     and si.used_at is null
     and si.revoked_at is null;

  insert into public.student_invites (proof, student_id, email)
  values (gen_random_uuid(), p_code, v_email)
  returning proof, expires_at
  into v_proof, v_expires_at;

  return jsonb_build_object(
           'ok', true,
           'email', v_email,
           'proof', v_proof,
           'expires_at', v_expires_at
         );
end;
$$;

revoke all on function public.register_student_email(bigint, text, text) from public;
grant execute on function public.register_student_email(bigint, text, text) to anon, authenticated;

-- 7. accept_student_invite: atomic single-claim of an invite. One UPDATE ...
--    RETURNING wins; any concurrent or late claimer falls into the
--    diagnostics below. The claimer must be signed in as exactly the auth
--    user the invite was linked to (auth.uid() is the request JWT subject).
create or replace function public.accept_student_invite(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_student_id bigint;
  v_code bigint;
  v_name text;
  v_used_at timestamptz;
  v_revoked_at timestamptz;
  v_expires_at timestamptz;
  v_invite_auth_uid uuid;
begin
  update public.student_invites si
     set used_at = now()
   where si.token = p_token
     and si.used_at is null
     and si.revoked_at is null
     and si.expires_at > now()
     and si.email = (select s.email from public.students s where s.id = si.student_id)
     and si.auth_user_id = auth.uid()
   returning si.student_id
   into v_student_id;

  if found then
    select s.id,
           (((s.first_lastname || coalesce(' '::text || s.second_lastname, ''::text))
              || ' '::text) || s.first_name)
             || coalesce(' '::text || s.second_name, ''::text)
      into v_code, v_name
      from public.students s
     where s.id = v_student_id;

    return jsonb_build_object(
             'ok', true,
             'student', jsonb_build_object(
               'code', v_code,
               'name', v_name
             )
           );
  end if;

  select si.used_at, si.revoked_at, si.expires_at, si.auth_user_id
    into v_used_at, v_revoked_at, v_expires_at, v_invite_auth_uid
    from public.student_invites si
   where si.token = p_token;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'INVITE_NOT_FOUND');
  end if;

  if v_used_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'ALREADY_USED');
  end if;

  if v_revoked_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'INVITE_NOT_FOUND');
  end if;

  if v_expires_at <= now() then
    return jsonb_build_object('ok', false, 'reason', 'INVITE_EXPIRED');
  end if;

  if v_invite_auth_uid is null
     or v_invite_auth_uid is distinct from auth.uid() then
    return jsonb_build_object('ok', false, 'reason', 'NOT_LINKED');
  end if;

  -- Remaining claim-condition mismatch (e.g. invite email no longer equals
  -- the student's email): the token is not claimable by anyone.
  return jsonb_build_object('ok', false, 'reason', 'INVITE_NOT_FOUND');
end;
$$;

revoke all on function public.accept_student_invite(uuid) from public;
grant execute on function public.accept_student_invite(uuid) to anon, authenticated;

-- 8. get_my_role: the requesting session's own role (NULL when unmapped).
create or replace function public.get_my_role()
returns text
language sql
security definer
set search_path = public, extensions
as $$
  select role::text
    from public.user_roles
   where auth_user_id = auth.uid()
$$;

revoke all on function public.get_my_role() from public, anon;
grant execute on function public.get_my_role() to authenticated;

-- 9. v_students: rebuilt (drop + create) with email, linked and
--    invite_pending; the original columns (code, number_list, name, grade)
--    and their expressions are preserved exactly. security_invoker must be
--    re-applied: the setting is dropped together with the view.
drop view if exists public.v_students;

create view public.v_students as
select
  id as code,
  number_list,
  (((first_lastname || coalesce(' '::text || second_lastname, ''::text))
     || ' '::text) || first_name)
    || coalesce(' '::text || second_name, ''::text) as name,
  course_id as grade,
  email,
  auth_user_id is not null as linked,
  public.student_invite_pending(id) as invite_pending
from public.students;

alter view public.v_students set (security_invoker = true);

-- 10. Seed: every existing auth user is an admin (students only gain the
--     student role through the invite flow).
insert into public.user_roles (auth_user_id, role)
select id, 'admin' from auth.users
on conflict do nothing;

commit;