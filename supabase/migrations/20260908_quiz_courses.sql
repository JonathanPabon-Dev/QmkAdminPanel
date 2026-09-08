-- Availability per course: one quiz can target several courses, each with its
-- own window (dates + times). Backfilled from the quizzes legacy columns.
create table quiz_courses (
  quiz_id text not null references quizzes (id) on delete cascade,
  course_id text not null references courses (id) on delete cascade,
  available_since date,
  available_until date,
  available_since_time time,
  available_until_time time,
  primary key (quiz_id, course_id)
);

comment on table quiz_courses is
  'Availability window per course for a quiz (multiple courses per quiz)';
comment on column quiz_courses.available_since is
  'Start date of the availability window for this course (NULL = any)';
comment on column quiz_courses.available_until is
  'End date of the availability window for this course (NULL = any)';
comment on column quiz_courses.available_since_time is
  'Start time of the availability window for this course (NULL = any)';
comment on column quiz_courses.available_until_time is
  'End time of the availability window for this course (NULL = any)';

-- Backfill: carry over the single-course assignment (if any) from quizzes.
insert into quiz_courses (quiz_id, course_id, available_since, available_until, available_since_time, available_until_time)
select id, course_id, available_since, available_until, available_since_time, available_until_time
from quizzes
where course_id is not null;