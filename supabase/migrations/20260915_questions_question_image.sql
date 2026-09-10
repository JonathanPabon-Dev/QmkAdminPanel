-- Allow questions to carry an optional image, mirroring the option image fields.
alter table public.questions
  add column if not exists question_image_url text;