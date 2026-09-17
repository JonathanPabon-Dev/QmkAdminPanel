-- 20260925_student_insert_initial_password.sql
-- Initial password for students created from the admin panel.
--   - Design intent (20260913): the initial password equals the student's
--     own code (id). The portal uses that password as identity proof to
--     register a Gmail and link the account with Google.
--   - The 20260913 backfill only covered rows that existed at that time;
--     rows inserted later (admin panel "Nuevo estudiante") got NULL
--     (login disabled) and could never prove identity in the portal.
--   - A BEFORE INSERT trigger restores that default only when the caller
--     did not provide an explicit hash.
begin;

create or replace function public.students_set_initial_password()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if NEW.password_hash is null then
    NEW.password_hash := crypt(NEW.id::text, gen_salt('bf'));
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_students_set_initial_password on public.students;

create trigger trg_students_set_initial_password
  before insert on public.students
  for each row
  when (NEW.password_hash is null)
  execute function public.students_set_initial_password();

commit;