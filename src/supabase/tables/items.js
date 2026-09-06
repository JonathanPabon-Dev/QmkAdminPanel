import { supabase } from "../client";
import { toast } from "react-toastify";

const Items = {
  getItems: async () => {
    try {
      const response = await supabase.from("items").select();
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  getItemsById: async (id) => {
    try {
      const response = await supabase.from("items").select().eq("id", id);
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  createItems: async (item) => {
    try {
      const response = await supabase.from("items").insert({ ...item });
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

  updateItems: async (item, id) => {
    try {
      const response = await supabase
        .from("items")
        .update({ ...item })
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

  deleteItem: async (itemId) => {
    try {
      const response = await supabase.from("items").delete().eq("id", itemId);
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

export default Items;
