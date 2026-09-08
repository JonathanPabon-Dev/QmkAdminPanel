-- Courses (grade+classroom groups), e.g. 10-1, 10-2, 11-1, 11-2.
-- "course" here is the classroom number within the grade.
create table courses (
  id text primary key,
  grade_level smallint not null,
  course smallint not null,
  unique (grade_level, course)
);

comment on column courses.id is 'Course code, e.g. 10-1';
comment on column courses.grade_level is 'Grade, e.g. 10';
comment on column courses.course is 'Classroom number within the grade, e.g. 1';

insert into courses (id, grade_level, course) values
  ('10-1', 10, 1),
  ('10-2', 10, 2),
  ('11-1', 11, 1),
  ('11-2', 11, 2);