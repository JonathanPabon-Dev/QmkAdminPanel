import { supabase } from "../client";
import { toast } from "react-toastify";

const Students = {
  getStudents: async () => {
    try {
      // PR4: la vista v_students incluye email, linked e invite_pending
      // (columnas agregadas en la migración 20260918); la lista las expone
      // en la tabla de estudiantes.
      const response = await supabase
        .from("v_students")
        .select("code, number_list, name, grade, email, linked, invite_pending");
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

  // PR3: registro del correo del estudiante (prueba la contrasena actual,
  // guarda el email y devuelve el proof de un solo uso). Los rechazos llegan
  // como { ok: false, reason } en data; la RPC no lanza para errores de negocio.
  registerStudentEmail: async ({ code, currentPassword, email }) => {
    try {
      return await supabase.rpc("register_student_email", {
        p_code: code,
        p_current_password: currentPassword,
        p_email: email,
      });
    } catch (error) {
      console.error(error);
      return { error };
    }
  },

  // PR3: envio del correo de invitacion via la edge function send-student-invite.
  // La funcion corre con verify_jwt deshabilitado: la cabecera apikey con la
  // key anonima alcanza (el proof de un solo uso es la puerta real). Incluye la
  // misma prefiltracion CORS que la RPC del portal: * + apikey/content-type.
  sendStudentInvite: async ({ proof }) => {
    try {
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/send-student-invite`,
        {
          method: "POST",
          headers: {
            apikey: supabase.supabaseKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ proof }),
        },
      );
      return await response.json();
    } catch (error) {
      console.error(error);
      return { ok: false, code: "INTERNAL" };
    }
  },

  // PR4: rol del usuario autenticado ('admin' | 'teacher' | 'student' | null).
  // La RPC es security definer y solo admite sesiones autenticadas; data null
  // significa que la cuenta no tiene fila en user_roles (no admin).
  getMyRole: async () => {
    try {
      return await supabase.rpc("get_my_role");
    } catch (error) {
      console.error(error);
      return { error };
    }
  },

  // PR5: student row linked to the authenticated session (names, course_id,
  // email and computed flags); data is null when the account has no linked
  // student. Same security-definer pattern as get_my_role; consumed by the
  // student dashboard (StudentDashboard).
  getStudentByAuthUid: async () => {
    try {
      return await supabase.rpc("get_student_by_auth_uid");
    } catch (error) {
      console.error(error);
      return { error };
    }
  },
};

export default Students;
