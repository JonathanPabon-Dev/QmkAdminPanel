-- Drop redundant legacy columns from quizzes that are now owned by quiz_courses.
-- quiz_courses already holds course_id + per-course availability window.
ALTER TABLE public.quizzes
  DROP COLUMN IF EXISTS course_id,
  DROP COLUMN IF EXISTS grade_level,
  DROP COLUMN IF EXISTS available_since,
  DROP COLUMN IF EXISTS available_until,
  DROP COLUMN IF EXISTS available_since_time,
  DROP COLUMN IF EXISTS available_until_time;
