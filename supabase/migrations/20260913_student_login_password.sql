-- 20260913_student_login_password.sql
-- Access control for the student quiz app: per-student password.
--   - students.password_hash is a bcrypt hash (pgcrypto crypt/bf).
--   - The quiz app may ONLY validate through login_student; there is no anon
--     SELECT on students (RLS stays authenticated-only for the admin panel).
--   - Initial password for every existing student = their own code (id).
--     A password-change feature will replace this default later.
begin;

create extension if not exists pgcrypto;

-- 1. Password hash column (NULL = login disabled).
alter table public.students
  add column if not exists password_hash text;

comment on column public.students.password_hash is
  'bcrypt hash of the student login password (NULL = login disabled)';

-- 2. Initial assignment: password = student code (id).
--    Idempotent: only rows with no hash (a re-run must not overwrite a
--    password that was later changed).
update public.students
   set password_hash = crypt(id::text, gen_salt('bf'))
 where password_hash is null;

-- 3. login_student: validates code + password server-side and returns the
--    student's public data only when both match; NULL otherwise. Uniform
--    failure avoids code enumeration (cannot tell "bad code" from "bad
--    password").
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
           'course_id', s.course_id
         )
    from public.students s
   where s.id = p_code
     and s.password_hash is not null
     and s.password_hash = crypt(p_password, s.password_hash)
$$;

revoke all on function public.login_student(bigint, text) from public;
grant execute on function public.login_student(bigint, text) to anon, authenticated;

-- 4. set_student_password: sets/resets a student password server-side (used
--    by the admin panel and the future password-change feature).
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
   where id = p_code;
  return found;
end;
$$;

revoke all on function public.set_student_password(bigint, text) from public;
grant execute on function public.set_student_password(bigint, text) to authenticated;

-- 5. RLS: the student quiz app reads quizzes/questions/parameters with the
--    anon (publishable) key. Add read-only policies for those three content
--    tables. students stays protected: student data only leaves via
--    login_student (never anon SELECT).
drop policy if exists "anon_read_quizzes" on public.quizzes;
create policy "anon_read_quizzes" on public.quizzes
  for select to anon using (true);

drop policy if exists "anon_read_questions" on public.questions;
create policy "anon_read_questions" on public.questions
  for select to anon using (true);

drop policy if exists "anon_read_parameters" on public.parameters;
create policy "anon_read_parameters" on public.parameters
  for select to anon using (true);

commit;