-- Add optional start/end times to define an availability window per quiz day.
-- NULL = no time restriction; the quiz is available the whole day.
alter table quizzes
  add column available_since_time time,
  add column available_until_time time;

comment on column quizzes.available_since_time is
  'Start time of the quiz availability window (NULL when not defined)';

comment on column quizzes.available_until_time is
  'End time of the quiz availability window (NULL when not defined)';