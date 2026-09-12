import { supabase } from "../client";

// Read-only wrappers over the quiz result views. No write operations are
// exposed: the results UI only reviews data already stored in Supabase.
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
};

export default Results;