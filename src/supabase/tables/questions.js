import { supabase } from "../client";
import { toast } from "react-toastify";

const Questions = {
  getQuestions: async () => {
    try {
      const response = await supabase.from("questions").select();
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  getQuestionById: async (questionId) => {
    try {
      const response = await supabase
        .from("questions")
        .select()
        .eq("id", questionId);
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  createQuestions: async (form) => {
    try {
      const response = await supabase.from("questions").insert({ ...form });
      if (response.status !== 201 || response.error) {
        toast.error("Error al crear el registro");
        return response;
      }
      toast.success("Registro creado correctamente");
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  updateQuestions: async (form, questionId) => {
    try {
      const response = await supabase
        .from("questions")
        .update({ ...form })
        .eq("id", questionId);
      if (response.status !== 204 || response.error) {
        toast.error("Error al actualizar el registro");
        return response;
      }
      toast.success("Registro actualizado correctamente");
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  deleteQuestions: async (questionId) => {
    try {
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