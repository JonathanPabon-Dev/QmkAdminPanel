-- 20260920_student_google_only_access.sql
-- Access is Google-only once the student confirms and links the account.
--   - accept_student_invite now DISABLES the student password in the same
--     update that writes the claim uid: after confirmation the code can no
--     longer authenticate with a password.
--   - login_student returns { google_only: true } for a code whose account is
--     already linked (there is no hash left to validate); every other branch
--     keeps the password + uniform-failure behavior.
--   - set_student_password / update_student_password refuse to re-enable a
--     password once the account is linked (Google-only access survives).
--   - register_student_email checks ALREADY_LINKED before the password proof:
--     a linked student has no hash, so the old order would misreport it as
--     INVALID_PASSWORD.
begin;

-- 1. accept_student_invite: the claim writes students.auth_user_id AND
--    disables the password (NULL hash = login disabled). Everything else is
--    unchanged from 20260919: same claim update, same failure reasons, same
--    user_roles insert.
create or replace function public.accept_student_invite(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_claim_uid uuid;
  v_student_id bigint;
  v_code bigint;
  v_name text;
  v_used_at timestamptz;
  v_revoked_at timestamptz;
  v_expires_at timestamptz;
  v_invite_auth_uid uuid;
begin
  v_claim_uid := auth.uid();

  update public.student_invites si
     set used_at = now()
   where si.token = p_token
     and si.used_at is null
     and si.revoked_at is null
     and si.expires_at > now()
     and si.email = (select s.email from public.students s where s.id = si.student_id)
     and si.auth_user_id = v_claim_uid
   returning si.student_id
   into v_student_id;

  if found then
    update public.students s
       set auth_user_id = v_claim_uid,
           password_hash = null
     where s.id = v_student_id;

    insert into public.user_roles (auth_user_id, role)
    values (v_claim_uid, 'student')
    on conflict do nothing;

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
     or v_invite_auth_uid is distinct from v_claim_uid then
    return jsonb_build_object('ok', false, 'reason', 'NOT_LINKED');
  end if;

  return jsonb_build_object('ok', false, 'reason', 'INVITE_NOT_FOUND');
end;
$$;

revoke all on function public.accept_student_invite(uuid) from public;
grant execute on function public.accept_student_invite(uuid) to anon, authenticated;

-- 2. login_student: a linked code is Google-only (no hash to validate, no
--    password accepted). Unlinked behavior stays identical, including
--    must_change_password.
create or replace function public.login_student(p_code bigint, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_student public.students%rowtype;
  v_invite_pending boolean;
begin
  select * into v_student
    from public.students s
   where s.id = p_code;

  if not found then
    return null;
  end if;

  if v_student.auth_user_id is not null then
    return jsonb_build_object(
             'id', v_student.id,
             'google_only', true
           );
  end if;

  if v_student.password_hash is null
     or v_student.password_hash <> crypt(p_password, v_student.password_hash) then
    return null;
  end if;

  select exists (
           select 1
             from public.student_invites si
            where si.student_id = v_student.id
              and si.used_at is null
              and si.revoked_at is null
         )
    into v_invite_pending;

  return jsonb_build_object(
           'id', v_student.id,
           'number_list', v_student.number_list,
           'first_name', v_student.first_name,
           'second_name', v_student.second_name,
           'first_lastname', v_student.first_lastname,
           'second_lastname', v_student.second_lastname,
           'grade_level', v_student.grade_level,
           'course_id', v_student.course_id,
           'must_change_password',
             v_student.password_hash = crypt(v_student.id::text, v_student.password_hash),
           'email', v_student.email,
           'auth_linked', false,
           'invite_pending', v_invite_pending
         );
end;
$$;

revoke all on function public.login_student(bigint, text) from public;
grant execute on function public.login_student(bigint, text) to anon, authenticated;

-- 3. update_student_password / set_student_password: a linked account can
--    never get a working password back; only unlinked students can change it.
create or replace function public.update_student_password(
  p_code bigint,
  p_current_password text,
  p_new_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_new_password is null
     or btrim(p_new_password) = ''
     or length(p_new_password) < 6 then
    return false;
  end if;

  update public.students s
     set password_hash = crypt(p_new_password, gen_salt('bf'))
   where s.id = p_code
     and s.auth_user_id is null
     and s.password_hash is not null
     and s.password_hash = crypt(p_current_password, s.password_hash);

  return found;
end;
$$;

revoke all on function public.update_student_password(bigint, text, text) from public;
grant execute on function public.update_student_password(bigint, text, text) to anon, authenticated;

create or replace function public.set_student_password(p_code bigint, p_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_password is null or btrim(p_password) = '' then
    return false;
  end if;
  update public.students
     set password_hash = crypt(p_password, gen_salt('bf'))
   where id = p_code
     and auth_user_id is null;
  return found;
end;
$$;

revoke all on function public.set_student_password(bigint, text) from public;
grant execute on function public.set_student_password(bigint, text) to authenticated;

-- 4. register_student_email: linked accounts reject with ALREADY_LINKED
--    before the password proof (a linked student has no hash by design).
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

  if v_student.auth_user_id is not null then
    return jsonb_build_object('ok', false, 'reason', 'ALREADY_LINKED');
  end if;

  if v_student.password_hash is null
     or p_current_password is null
     or v_student.password_hash <> crypt(p_current_password, v_student.password_hash) then
    return jsonb_build_object('ok', false, 'reason', 'INVALID_PASSWORD');
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

commit;
