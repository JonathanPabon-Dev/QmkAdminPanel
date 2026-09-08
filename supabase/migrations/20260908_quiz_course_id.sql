-- Add optional course link so quizzes can be scoped to a specific class.
-- grade_level remains for backward compatibility; it is auto-derived from
-- course_id at the application layer.
alter table quizzes
  add column course_id text;

comment on column quizzes.course_id is
  'Course code (FK to courses.id), e.g. 10-1; grade_level is derived from it';