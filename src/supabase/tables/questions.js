import { supabase, validateConnection } from "../client";
import { toast } from "react-toastify";

const Questions = {
  getQuestions: async () => {
    try {
      if (!validateConnection) {
        throw new Error("Error de conexión.");
      }
      const response = await supabase.from("questions").select();
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  getQuestionById: async (questionId) => {
    try {
      if (!validateConnection) {
        throw new Error("Error de conexión.");
      }
      const response = await supabase
        .from("questions")
        .select()
        .eq("id", questionId);
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  createQuestions: async (question) => {
    try {
      if (!validateConnection) {
        throw new Error("Error de conexión.");
      }
      const response = await supabase.from("questions").insert({ ...question });
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

  updateQuestions: async (question, questionId) => {
    try {
      if (!validateConnection) {
        throw new Error("Error de conexión.");
      }
      const response = await supabase
        .from("questions")
        .update({ ...question })
        .eq("id", questionId);
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

  deleteQuestions: async (questionId) => {
    try {
      if (!validateConnection) {
        throw new Error("Error de conexión.");
      }
      const response = await supabase
        .from("questions")
        .delete()
        .eq("id", questionId);
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

export default Questions;
