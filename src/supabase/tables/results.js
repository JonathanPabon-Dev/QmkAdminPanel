import { supabase } from "../client";

// Read-only wrappers over the quiz result views. No write operations are
// exposed: the results UI only reviews data already stored in Supabase.
// deleteResult is the single exception: the admin panel removes a student's
// result for one quiz, and the deletion spans both tables (answers detail +
// quiz_results summary). answers is deleted first so no orphaned detail rows
// remain if a FK references quiz_results.
const Results = {
  getResults: async () => {
    try {
      const response = await supabase.from("v_quiz_result_rows").select();
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  getAnswersByStudentQuiz: async (studentId, quizId) => {
    try {
      const response = await supabase
        .from("v_quiz_result_answers")
        .select()
        .eq("student_id", studentId)
        .eq("quiz_id", quizId);
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  deleteResult: async (studentId, quizId) => {
    try {
      // Borra primero el detalle (answers) y luego el resumen (quiz_results).
      // No hay RLS en estas tablas (la app del estudiante las escribe con la
      // key anónima), así que la key publishable del panel puede borrar.
      const answersResponse = await supabase
        .from("answers")
        .delete()
        .eq("student_id", studentId)
        .eq("quiz_id", quizId);
      if (answersResponse.error) return answersResponse;
      return await supabase
        .from("quiz_results")
        .delete()
        .eq("student_id", studentId)
        .eq("quiz_id", quizId);
    } catch (error) {
      console.error(error);
    }
  },
};

export default Results;