import { supabase } from "../client";
import { toast } from "react-toastify";

const Subjects = {
  getSubjects: async () => {
    try {
      const response = await supabase.from("subjects").select();
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  getSubjectsById: async (id) => {
    try {
      const response = await supabase.from("subjects").select().eq("id", id);
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  createSubjects: async (parameter) => {
    try {
      const response = await supabase.from("subjects").insert({ ...parameter });
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

  updateSubjects: async (subject, id) => {
    try {
      const response = await supabase
        .from("subjects")
        .update({ ...subject })
        .eq("id", id);
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

  deleteSubjects: async (subjectId) => {
    try {
      const response = await supabase
        .from("subjects")
        .delete()
        .eq("id", subjectId);
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

export default Subjects;
