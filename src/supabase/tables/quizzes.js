import { supabase } from "../client";
import { toast } from "react-toastify";

const Quizzes = {
  getQuizzes: async () => {
    try {
      const response = await supabase.from("quizzes").select();
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  getQuizById: async (quizId) => {
    try {
      const response = await supabase.from("quizzes").select().eq("id", quizId);
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  createQuizzes: async (quiz) => {
    try {
      const response = await supabase.from("quizzes").insert({ ...quiz });
      if (response.status === 201) {
        toast.success("Registro creado correctamente");
      } else {
        toast.error("Error al crear el registro");
      }
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  updateQuizzes: async (quiz, quizId) => {
    try {
      const response = await supabase
        .from("quizzes")
        .update({ ...quiz })
        .eq("id", quizId);
      if (response.status === 204) {
        toast.success("Registro actualizado correctamente");
      } else {
        toast.error("Error al actualizar el registro");
      }
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  deleteQuizzes: async (quizId) => {
    try {
      const response = await supabase.from("quizzes").delete().eq("id", quizId);
      if (response.status === 204) {
        toast.success("Registro eliminado correctamente");
      } else {
        toast.error("Error al eliminar el registro");
      }
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  getQuizWithQuestions: async (quizId) => {
    try {
      const response = await supabase
        .from("quizzes")
        .select("*, quiz_questions(question_id)")
        .eq("id", quizId);
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  getAvailableQuestions: async (quizId) => {
    try {
      const quizResponse = await supabase
        .from("quizzes")
        .select("quiz_questions(question_id)")
        .eq("id", quizId);
      if (quizResponse.error) {
        return quizResponse;
      }
      const associatedIds = new Set(
        (quizResponse.data?.[0]?.quiz_questions ?? []).map(
          (relation) => relation.question_id,
        ),
      );
      const questionsResponse = await supabase.from("questions").select();
      if (questionsResponse.error) {
        return questionsResponse;
      }
      return {
        ...questionsResponse,
        data: (questionsResponse.data ?? []).filter(
          (question) => !associatedIds.has(question.id),
        ),
      };
    } catch (error) {
      console.error(error);
    }
  },

  addQuestionToQuiz: async (quizId, questionId) => {
    try {
      const response = await supabase
        .from("quiz_questions")
        .insert({ quiz_id: quizId, question_id: questionId });
      if (response.status === 201) {
        toast.success("Registro creado correctamente");
      } else {
        toast.error("Error al crear el registro");
      }
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  removeQuestionFromQuiz: async (quizId, questionId) => {
    try {
      const response = await supabase
        .from("quiz_questions")
        .delete()
        .eq("quiz_id", quizId)
        .eq("question_id", questionId);
      if (response.status === 204) {
        toast.success("Registro eliminado correctamente");
      } else {
        toast.error("Error al eliminar el registro");
      }
      return response;
    } catch (error) {
      console.error(error);
    }
  },
};

export default Quizzes;
