-- Permitir opciones con solo imagen: quitar NOT NULL a los textos de las
-- opciones 1 y 2 (las 3 y 4 ya son opcionales). La regla "texto O imagen"
-- por opcion la valida el frontend (validateOptionForm en QuestionsPage).
ALTER TABLE public.questions ALTER COLUMN option_1_text DROP NOT NULL;
ALTER TABLE public.questions ALTER COLUMN option_2_text DROP NOT NULL;