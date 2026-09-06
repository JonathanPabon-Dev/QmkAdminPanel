import { supabase } from "../client";
import { toast } from "react-toastify";

const Students = {
  getStudents: async () => {
    try {
      const response = await supabase.from("v_students").select();
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  getStudentsById: async (studentId) => {
    try {
      // La vista v_students no expone la PK; su columna "code" ES el id de la
      // tabla students (code === id, verificada contra la base). La UI pasa ese
      // mismo valor como studentId.
      const response = await supabase
        .from("students")
        .select()
        .eq("id", studentId);
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  createStudents: async (student) => {
    try {
      const response = await supabase.from("students").insert({ ...student });
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

  updateStudents: async (student, studentId) => {
    try {
      const response = await supabase
        .from("students")
        .update({ ...student })
        .eq("id", studentId);
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

  deleteStudents: async (studentId) => {
    try {
      const response = await supabase
        .from("students")
        .delete()
        .eq("id", studentId);
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

export default Students;
