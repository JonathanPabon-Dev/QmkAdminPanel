-- Connect students to courses (Opción A):
--   grade_level stays in students for direct grade filtering (no JOIN);
--   course_id is the formal FK to courses.id, replacing the free-text course.
alter table students
  add column course_id text references courses (id) on delete set null;

-- Backfill from the current grade_level + course combination.
update students s
set course_id = c.id
from courses c
where c.grade_level = s.grade_level
  and c.course = s.course;

-- Recreate v_students before dropping course: grade now comes from course_id
-- (already shaped as "10-1"), removing the dependency on students.course.
create or replace view v_students as
select
  id as code,
  (((first_lastname || coalesce(' '::text || second_lastname, ''::text))
     || ' '::text) || first_name)
    || coalesce(' '::text || second_name, ''::text) as name,
  course_id as grade
from students;

alter table students drop column course;