-- 20260919_student_link_and_role.sql
-- PR3 addendum: close the cross-slice linkage gap left by PR1/PR2.
-- PR1's accept_student_invite only set used_at; nothing ever wrote
-- students.auth_user_id nor the student's row in user_roles, so
-- v_students.linked, login_student.auth_linked and the ALREADY_LINKED
-- guard stayed inert. On the SAME successful claim path this version also:
--   - writes the claiming uid to students.auth_user_id, and
--   - records the student role in user_roles (on conflict do nothing).
-- The atomic single-UPDATE claim, every failure reason code, the
-- revoke-from-public pattern and the anon/authenticated grants are
-- unchanged from PR1's accept_student_invite.
begin;

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
  -- The JWT subject is captured once so the claim update, the student link
  -- and the role insert all reference the same uid. auth.uid() is null for
  -- anonymous callers, which is exactly why the claim update refuses to
  -- match for them (null = null is never true).
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
    -- Link the student row to the claiming auth user: v_students.linked,
    -- login_student.auth_linked and register_student_email's ALREADY_LINKED
    -- guard all activate from here on.
    update public.students s
       set auth_user_id = v_claim_uid
     where s.id = v_student_id;

    -- Record the student role. on conflict do nothing keeps an existing
    -- mapping (unreachable in practice: register_student_email rejects
    -- emails that already have an auth user) from being overwritten.
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

  -- Remaining claim-condition mismatch (e.g. invite email no longer equals
  -- the student's email): the token is not claimable by anyone.
  return jsonb_build_object('ok', false, 'reason', 'INVITE_NOT_FOUND');
end;
$$;

revoke all on function public.accept_student_invite(uuid) from public;
grant execute on function public.accept_student_invite(uuid) to anon, authenticated;

commit;