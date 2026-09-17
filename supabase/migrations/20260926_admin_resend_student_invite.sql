-- Admin resend of a student's confirmation email. The student-side flow
-- (register_student_email) requires the current password to mint a proof;
-- an admin may mint a fresh proof without it. The client then calls the
-- same send-student-invite edge function with that proof (unchanged).
--
-- Validations map to reason codes; every failure path returns
-- { ok: false, reason }.
create or replace function public.admin_resend_student_invite(
  p_student_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text;
  v_auth_user_id uuid;
  v_proof uuid;
  v_expires_at timestamptz;
begin
  if not exists (
       select 1
         from public.user_roles ur
        where ur.auth_user_id = auth.uid()
          and ur.role = 'admin'
     ) then
    return jsonb_build_object('ok', false, 'reason', 'FORBIDDEN');
  end if;

  select s.email, s.auth_user_id
    into v_email, v_auth_user_id
    from public.students s
   where s.id = p_student_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'STUDENT_NOT_FOUND');
  end if;

  if v_email is null then
    return jsonb_build_object('ok', false, 'reason', 'NO_EMAIL');
  end if;

  if v_auth_user_id is not null then
    return jsonb_build_object('ok', false, 'reason', 'ALREADY_LINKED');
  end if;

  update public.student_invites si
     set revoked_at = now()
   where si.student_id = p_student_id
     and si.used_at is null
     and si.revoked_at is null;

  insert into public.student_invites (proof, student_id, email)
  values (gen_random_uuid(), p_student_id, v_email)
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

revoke all on function public.admin_resend_student_invite(bigint) from public;
grant execute on function public.admin_resend_student_invite(bigint) to authenticated;