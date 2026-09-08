import { supabase } from "../client";
import { toast } from "react-toastify";

const Courses = {
  getCourses: async () => {
    try {
      const response = await supabase.from("courses").select();
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  getCoursesById: async (id) => {
    try {
      const response = await supabase.from("courses").select().eq("id", id);
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  createCourses: async (course) => {
    try {
      const response = await supabase.from("courses").insert({ ...course });
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

  updateCourses: async (course, id) => {
    try {
      const response = await supabase
        .from("courses")
        .update({ ...course })
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

  deleteCourses: async (courseId) => {
    try {
      const response = await supabase
        .from("courses")
        .delete()
        .eq("id", courseId);
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

export default Courses;