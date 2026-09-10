-- Allow the anonymous student quiz app to read the junction tables needed to
-- list a student's quizzes (quiz_courses -> courses -> quizzes) and to load
-- the questions of a quiz (quiz_questions -> questions).
-- Naming follows the existing anon_read_* convention (quizzes, questions,
-- parameters). content exposure is limited to the ids/topics needed by the app.
create policy anon_read_courses on public.courses for select to anon using (true);
create policy anon_read_quiz_courses on public.quiz_courses for select to anon using (true);
create policy anon_read_quiz_questions on public.quiz_questions for select to anon using (true);