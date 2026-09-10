-- 20260914_student_password_change.sql
-- Self-service password change for students (hosted on the admin panel for now).
--   - login_student now reports must_change_password: true when the stored
--     bcrypt hash still equals the student's code (the initial default), so
--     the server owns the "force password change" decision instead of the client.
--   - update_student_password lets a student set a new password only by
--     proving the current one; knowing a code alone is never enough to
--     change someone else's password.
--   - Both functions stay anon-callable because the student screen runs on
--     the publishable (anon) key and never signs in to Supabase Auth.

begin;

-- 1. login_student: add must_change_password to the returned payload.
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
           'must_change_password', s.password_hash = crypt(s.id::text, s.password_hash)
         )
    from public.students s
   where s.id = p_code
     and s.password_hash is not null
     and s.password_hash = crypt(p_password, s.password_hash)
$$;

-- 2. update_student_password: changes the hash only when the caller proves
--    the current password (minimum length enforced server-side too).
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
     and s.password_hash is not null
     and s.password_hash = crypt(p_current_password, s.password_hash);

  return found;
end;
$$;

revoke all on function public.login_student(bigint, text) from public;
grant execute on function public.login_student(bigint, text) to anon, authenticated;

revoke all on function public.update_student_password(bigint, text, text) from public;
grant execute on function public.update_student_password(bigint, text, text) to anon, authenticated;

commit;