import { supabase, validateConnection } from "../client";
import { toast } from "react-toastify";

const Quizzes = {
  getQuizzes: async () => {
    try {
      if (!validateConnection) {
        throw new Error("Error de conexión.");
      }
      const response = await supabase.from("quizzes").select();
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  getQuizById: async (quizId) => {
    try {
      if (!validateConnection) {
        throw new Error("Error de conexión.");
      }
      const response = await supabase.from("quizzes").select().eq("id", quizId);
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  createQuizzes: async (quiz) => {
    try {
      if (!validateConnection) {
        throw new Error("Error de conexión.");
      }
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
      if (!validateConnection) {
        throw new Error("Error de conexión.");
      }
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
      if (!validateConnection) {
        throw new Error("Error de conexión.");
      }
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
};

export default Quizzes;
