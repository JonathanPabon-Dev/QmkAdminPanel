import { supabase } from "../client";
import { toast } from "react-toastify";

const Quizzes = {
  getQuizzes: async () => {
    try {
      // Incluye quiz_courses para mostrar los cursos asociados en el listado.
      const response = await supabase.from("quizzes").select("*, quiz_courses(*)");
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  getQuizById: async (quizId) => {
    try {
      const response = await supabase
        .from("quizzes")
        .select("*, quiz_courses(*)")
        .eq("id", quizId);
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

  // Reemplaza las relaciones quiz_courses del quiz por la lista dada. Cada
  // elemento trae course_id y su ventana (available_since/until/time).
  syncQuizCourses: async (quizId, courses) => {
    try {
      const deleteResponse = await supabase
        .from("quiz_courses")
        .delete()
        .eq("quiz_id", quizId);
      if (
        deleteResponse.status !== 204 &&
        deleteResponse.status !== 200 &&
        deleteResponse.error
      ) {
        toast.error("Error al actualizar los cursos");
        return deleteResponse;
      }
      if (courses.length === 0) return deleteResponse;
      const rows = courses.map((course) => ({
        quiz_id: quizId,
        course_id: course.course_id,
        available_since: course.available_since || null,
        available_until: course.available_until || null,
        available_since_time: course.available_since_time || null,
        available_until_time: course.available_until_time || null,
      }));
      const insertResponse = await supabase
        .from("quiz_courses")
        .insert(rows);
      if (insertResponse.error) {
        toast.error("Error al guardar los cursos");
      }
      return insertResponse;
    } catch (error) {
      console.error(error);
    }
  },
};

export default Quizzes;
