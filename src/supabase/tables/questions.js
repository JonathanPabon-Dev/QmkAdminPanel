import { supabase } from "../client";
import { toast } from "react-toastify";

const Questions = {
  getQuestions: async () => {
    try {
      const response = await supabase
        .from("questions")
        .select()
        .order("id");
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

  // Uploads an option image to the public bucket and returns its public URL.
  // On failure it toasts and returns { error } (no throw) so the caller can
  // decide how to react; the Modal keeps the previous value in that case.
  uploadOptionImage: async (file) => {
    try {
      const path = `question-options/${Date.now()}-${file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      )}`;
      const { error } = await supabase.storage
        .from("question-options")
        .upload(path, file);
      if (error) {
        toast.error("Error al subir la imagen");
        return { error };
      }
      const { data } = supabase.storage
        .from("question-options")
        .getPublicUrl(path);
      return data.publicUrl;
    } catch (error) {
      console.error(error);
      toast.error("Error al subir la imagen");
      return { error };
    }
  },
};

export default Questions;