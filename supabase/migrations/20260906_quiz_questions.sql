-- Replace questions.quiz_id (1:N) with a quiz_questions junction table (N:M).
begin;

create table public.quiz_questions (
  quiz_id text not null references public.quizzes (id) on delete cascade,
  question_id text not null references public.questions (id) on delete cascade,
  primary key (quiz_id, question_id)
);

-- The main lookup is by question, so index question_id.
create index quiz_questions_question_id_idx on public.quiz_questions (question_id);

-- Backfill the junction from the existing 1:N relationship.
insert into public.quiz_questions (quiz_id, question_id)
select quiz_id, id
from public.questions;

-- Drops the quiz_id column together with its fk_quiz constraint.
alter table public.questions drop column quiz_id;

commit;