-- Add the number of questions to evaluate per quiz.
-- NULL = undefined yet; the admin defines it when editing the quiz.
alter table quizzes
  add column question_count smallint;

comment on column quizzes.question_count is
  'Number of questions evaluated in this quiz (NULL when not defined)';