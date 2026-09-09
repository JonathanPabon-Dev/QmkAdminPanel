-- Add optional test duration in seconds for a quiz.
-- NULL = no time limit; the exam timer is disabled.
alter table quizzes
  add column duration_seconds integer;

comment on column quizzes.duration_seconds is
  'Test duration in seconds (NULL when the exam has no time limit)';