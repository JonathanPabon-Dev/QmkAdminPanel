import { supabase } from "../client";
import { toast } from "react-toastify";

const Parameters = {
  getParameters: async () => {
    try {
      const response = await supabase.from("parameters").select();
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  getParametersById: async (id) => {
    try {
      const response = await supabase.from("parameters").select().eq("id", id);
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  createParameters: async (parameter) => {
    try {
      const response = await supabase
        .from("parameters")
        .insert({ ...parameter });
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

  updateParameters: async (parameter, id) => {
    try {
      const response = await supabase
        .from("parameters")
        .update({ ...parameter })
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

  deleteParameter: async (parameterId) => {
    try {
      const response = await supabase
        .from("parameters")
        .delete()
        .eq("id", parameterId);
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

export default Parameters;
