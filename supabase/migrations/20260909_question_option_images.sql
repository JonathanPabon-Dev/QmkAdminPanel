-- Optional image per question option (1-4): each option keeps its text and can
-- also reference an image stored in the public 'question-options' bucket.
-- The app has no auth (everything runs with the publishable key / anon role),
-- so anon writes are allowed here, consistently with the questions table.
begin;

alter table public.questions
  add column option_1_image_url text,
  add column option_2_image_url text,
  add column option_3_image_url text,
  add column option_4_image_url text;

insert into storage.buckets (id, name, public)
values ('question-options', 'question-options', true)
on conflict (id) do nothing;

-- Public read: images are served straight from their public CDN URL.
create policy question_options_public_read
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'question-options');

-- Write access for anon + authenticated (anon is the app role in production).
create policy question_options_anon_insert
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'question-options');

create policy question_options_anon_update
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'question-options')
  with check (bucket_id = 'question-options');

create policy question_options_anon_delete
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'question-options');

commit;