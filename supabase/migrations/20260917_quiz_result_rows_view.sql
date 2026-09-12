-- Vistas de resultados por estudiante y evaluación (módulo de revisión).
--
-- El módulo muestra una lista como la de estudiantes donde cada evaluación
-- es una columna. Como el conjunto de evaluaciones es dinámico, NINGUNA de
-- estas vistas pivotea en SQL: expone filas normalizadas y el frontend
-- construye las columnas a partir de los quizzes presentes. Un pivot
-- estático rompería al crear el próximo quiz y crosstab() no se puede
-- exponer por PostgREST (resultado de columnas dinámicas).
--
-- v_quiz_result_rows  -> una fila por (estudiante x evaluación), con todo
--                        el contexto de estudiante, quiz, materia y curso,
--                        más agregados de las respuestas registradas.
-- v_quiz_result_answers -> una fila por respuesta (estudiante x quiz x
--                        pregunta): la opción elegida vs. la correcta.
--
-- LEFT JOINs: conservan filas cuyo estudiante o quiz ya no exista en sus
-- tablas maestras (los datos de resultados se conservan igualmente).

-- ============== Resultados por estudiante y evaluación ==============
drop view if exists v_quiz_result_rows;

create view v_quiz_result_rows as
select
  -- Estudiante
  qr.student_id,
  st.number_list         as student_number_list,
  (
    ((st.first_lastname || coalesce(' '::text || st.second_lastname, ''::text))
       || ' '::text) || st.first_name
  ) || coalesce(' '::text || st.second_name, ''::text) as student_name,
  st.course_id           as student_grade,
  c.grade_level          as course_grade_level,
  c.course               as course_number,
  -- Evaluación
  qr.quiz_id,
  q.topic                as quiz_topic,
  q.subject_id           as quiz_subject_id,
  sub.name               as quiz_subject_name,
  q.question_count       as quiz_question_count,
  q.duration_seconds     as quiz_duration_seconds,
  -- Resultado
  qr.score,
  qr.date_taken,
  -- Agregados de respuestas registradas para ese estudiante en ese quiz
  ans.total_answers,
  ans.correct_answers,
  ans.incorrect_answers
from quiz_results qr
left join students st on st.id = qr.student_id
left join courses c on c.id = st.course_id
left join quizzes q on q.id = qr.quiz_id
left join subjects sub on sub.id = q.subject_id
left join (
  select
    student_id,
    quiz_id,
    count(*)                                    as total_answers,
    count(*) filter (where is_correct)          as correct_answers,
    count(*) filter (where not is_correct)      as incorrect_answers
  from answers
  group by student_id, quiz_id
) ans on ans.student_id = qr.student_id and ans.quiz_id = qr.quiz_id;

-- ============== Detalle de respuestas por estudiante y quiz ==============
drop view if exists v_quiz_result_answers;

create view v_quiz_result_answers as
select
  a.id,
  -- Estudiante
  a.student_id,
  st.number_list         as student_number_list,
  (
    ((st.first_lastname || coalesce(' '::text || st.second_lastname, ''::text))
       || ' '::text) || st.first_name
  ) || coalesce(' '::text || st.second_name, ''::text) as student_name,
  st.course_id           as student_grade,
  -- Quiz
  a.quiz_id,
  q.topic                as quiz_topic,
  -- Pregunta
  a.question_id,
  qu.question_text,
  qu.question_image_url,
  qu.correct_option,
  a.selected_option,
  a.is_correct,
  -- Textos e imágenes de opciones (para render sin joins extra en el frontend)
  qu.option_1_text,
  qu.option_2_text,
  qu.option_3_text,
  qu.option_4_text,
  qu.option_1_image_url,
  qu.option_2_image_url,
  qu.option_3_image_url,
  qu.option_4_image_url,
  case a.selected_option
    when 1 then qu.option_1_text
    when 2 then qu.option_2_text
    when 3 then qu.option_3_text
    when 4 then qu.option_4_text
  end                    as selected_option_text,
  case qu.correct_option
    when 1 then qu.option_1_text
    when 2 then qu.option_2_text
    when 3 then qu.option_3_text
    when 4 then qu.option_4_text
  end                    as correct_option_text
from answers a
left join students st on st.id = a.student_id
left join quizzes q on q.id = a.quiz_id
left join questions qu on qu.id = a.question_id;

-- Reutiliza los grants de las demás vistas del panel (lectura anónima).
grant select on v_quiz_result_rows to anon, authenticated;
grant select on v_quiz_result_answers to anon, authenticated;