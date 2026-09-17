-- 20260924_get_student_by_auth_uid.sql
-- Student dashboard (PR5): fetch the student row linked to the requesting
-- auth session.
--   - Payload mirrors login_student for the linked case: names, course_id,
--     email plus the computed flags must_change_password / google_only /
--     auth_linked. Those three are NOT stored columns; the boolean
--     expressions replicate login_student exactly (must_change_password
--     yields JSON null for Google-linked students, whose password_hash is
--     NULL by design since 20260920).
--   - Returns null when the account has no linked student; the dashboard
--     renders the unlinked state instead of the workspace.
--   - Security definer, authenticated-only execute: same gate as get_my_role
--     (20260918, section 8).
begin;

create or replace function public.get_student_by_auth_uid()
returns jsonb
language sql
security definer
set search_path = public, extensions
as $$
  select jsonb_build_object(
           'id', s.id,
           'first_name', s.first_name,
           'second_name', s.second_name,
           'first_lastname', s.first_lastname,
           'second_lastname', s.second_lastname,
           'course_id', s.course_id,
           'must_change_password', s.password_hash = crypt(s.id::text, s.password_hash),
           'google_only', s.auth_user_id is not null,
           'email', s.email,
           'auth_linked', s.auth_user_id is not null
         )
    from public.students s
   where s.auth_user_id = auth.uid()
$$;

revoke all on function public.get_student_by_auth_uid() from public, anon;
grant execute on function public.get_student_by_auth_uid() to authenticated;

commit;