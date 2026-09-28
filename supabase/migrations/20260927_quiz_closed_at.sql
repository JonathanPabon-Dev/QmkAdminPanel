-- Cierre de notas: timestamptz en quizzes. NULL = abierto (los pendientes se
-- muestran como P); un valor = notas cerradas (los pendientes cuentan como 0).
alter table quizzes add column if not exists closed_at timestamptz;

comment on column quizzes.closed_at is
  'Timestamp de cierre de notas; NULL mientras el cuestionario esté abierto.';