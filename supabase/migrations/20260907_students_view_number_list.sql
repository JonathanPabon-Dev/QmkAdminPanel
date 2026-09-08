-- Include number_list in v_students so the students screen can show it.
-- DROP + CREATE: CREATE OR REPLACE VIEW cannot rename/reorder existing columns.
drop view if exists v_students;

create view v_students as
select
  id as code,
  number_list,
  (((first_lastname || coalesce(' '::text || second_lastname, ''::text))
     || ' '::text) || first_name)
    || coalesce(' '::text || second_name, ''::text) as name,
  course_id as grade
from students;