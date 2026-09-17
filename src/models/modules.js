// Student workspace modules rendered as cards in StudentDashboard.
// `url` points to another app sharing the same Supabase backend; point
// VITE_ICFES_QUIZ_APP_URL at each deployment (this constant is the fallback).
// UI labels stay in Spanish to match the student-facing app.
export const STUDENT_MODULES = [
  {
    key: "quizzes",
    title: "Cuestionarios",
    description: "Realiza tus actividades y cuestionarios.",
    url:
      import.meta.env.VITE_ICFES_QUIZ_APP_URL ??
      "https://jonathanpabon-dev.github.io/IcfesQuizApp/",
    available: true,
  },
  {
    key: "notes",
    title: "Notas",
    description: "Consulta tus notas y resultados.",
    url: null,
    available: false,
  },
];