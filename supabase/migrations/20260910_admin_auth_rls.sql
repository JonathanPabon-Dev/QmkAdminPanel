-- Admin panel access control: enable Row Level Security on every table the
-- admin panel manages, allow full CRUD only for authenticated users, and
-- tighten the question-options storage bucket to authenticated writes.
-- answers / quiz_results are intentionally left untouched (student quiz app).
begin;

-- Drop the dashboard-generated policies on items/parameters. Their
-- "Read all users" policies grant public (anon) SELECT, which would defeat
-- the login gate once RLS is enabled.
drop policy if exists "Read all users" on public.items;
drop policy if exists "Insert authenticated users" on public.items;
drop policy if exists "Update authenticated users" on public.items;
drop policy if exists "Delete authenticated users" on public.items;

drop policy if exists "Read all users" on public.parameters;
drop policy if exists "Insert authenticated users" on public.parameters;
drop policy if exists "Update authenticated users" on public.parameters;
drop policy if exists "Delete authenticated users" on public.parameters;

-- Enable RLS on every table managed by the admin panel.
alter table public.courses enable row level security;
alter table public.items enable row level security;
alter table public.parameters enable row level security;
alter table public.questions enable row level security;
alter table public.quiz_courses enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quizzes enable row level security;
alter table public.students enable row level security;
alter table public.subjects enable row level security;

-- Uniform full CRUD for authenticated users (the admin panel itself).
create policy "authenticated_access_courses" on public.courses
  for all to authenticated using (true) with check (true);
create policy "authenticated_access_items" on public.items
  for all to authenticated using (true) with check (true);
create policy "authenticated_access_parameters" on public.parameters
  for all to authenticated using (true) with check (true);
create policy "authenticated_access_questions" on public.questions
  for all to authenticated using (true) with check (true);
create policy "authenticated_access_quiz_courses" on public.quiz_courses
  for all to authenticated using (true) with check (true);
create policy "authenticated_access_quiz_questions" on public.quiz_questions
  for all to authenticated using (true) with check (true);
create policy "authenticated_access_quizzes" on public.quizzes
  for all to authenticated using (true) with check (true);
create policy "authenticated_access_students" on public.students
  for all to authenticated using (true) with check (true);
create policy "authenticated_access_subjects" on public.subjects
  for all to authenticated using (true) with check (true);

-- v_students runs with the invoker's privileges, so RLS on students applies
-- through the view (otherwise the view would bypass RLS as the creator).
alter view public.v_students set (security_invoker = true);

-- Storage: keep images publicly readable (they are served by their public
-- CDN URL), but writes now require an authenticated session.
drop policy if exists question_options_anon_insert on storage.objects;
drop policy if exists question_options_anon_update on storage.objects;
drop policy if exists question_options_anon_delete on storage.objects;

create policy question_options_authenticated_write
  on storage.objects for all
  to authenticated
  using (bucket_id = 'question-options')
  with check (bucket_id = 'question-options');

commit;