import { useCallback, useState, useEffect } from "react";
import { toast } from "react-toastify";
import Students from "../supabase/tables/students";
import Courses from "../supabase/tables/courses";
import { studentsFields } from "../models/fields";
import Table from "../components/Table";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import Swal from "sweetalert2";

// PR4: estado de vinculacion del correo del estudiante. La vista v_students
// deriva linked de students.auth_user_id; invite_pending indica una
// invitacion pendiente de usar (o reenviar desde el portal).
const LinkStateBadge = ({ linked, invitePending }) => {
  if (linked) {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
        Vinculado
      </span>
    );
  }
  if (invitePending) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
        Confirmación pendiente
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
      Sin correo
    </span>
  );
};

// PR6: reenvio de la confirmacion desde el modulo de estudiantes. La RPC
// admin (admin_resend_student_invite) valida el rol, revoca la invitacion
// pendiente y emite un proof nuevo; el envio del correo reutiliza la edge
// function send-student-invite del portal.
const maskEmail = (email) => {
  if (!email) return "";
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
};

const resendInviteError = (reason) => {
  const messages = {
    FORBIDDEN: "No tienes permisos para esta acción.",
    STUDENT_NOT_FOUND: "Estudiante no encontrado.",
    NO_EMAIL: "Este estudiante no tiene un correo registrado.",
    ALREADY_LINKED: "Esta cuenta ya está vinculada con Google.",
  };
  return (
    messages[reason] ?? "No se pudo reenviar la confirmación. Intenta de nuevo."
  );
};

const resendSendError = (code) => {
  const messages = {
    INVALID_PROOF: "La confirmación no es válida. Intenta de nuevo.",
    PROOF_USED: "La confirmación ya fue enviada. Revisa tu correo.",
    INVITE_EXPIRED: "La confirmación caducó. Intenta de nuevo.",
    GMAIL_ONLY: "Solo se admiten correos de Gmail.",
    EMAIL_SEND_FAILED: "No se pudo enviar el correo. Intenta de nuevo.",
  };
  return (
    messages[code] ??
    "Ocurrió un error al enviar la confirmación. Intenta de nuevo."
  );
};

const StudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("");
  const [fields, setFields] = useState(studentsFields);
  const [studentId, setStudentId] = useState(null);
  const [filterValue, setFilterValue] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  // Opciones del select de Curso, en el formato que espera FormField.
  const [courseOptions, setCourseOptions] = useState([]);
  // PR6: code del estudiante cuyo reenvio de confirmacion esta en vuelo
  // (deshabilita el boton "Reenviar" de esa fila y muestra "Enviando...").
  const [resendingCode, setResendingCode] = useState(null);

  function resetStates() {
    setStudents([]);
    setLoading(false);
    setModalOpen(false);
    setModalMode("");
    setFields(studentsFields);
    setStudentId(null);
    setFilterValue("");
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await Students.getStudents();
      setStudents(response.data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }, []);

  const loadCourses = useCallback(async () => {
    try {
      const response = await Courses.getCourses();
      setCourseOptions([
        {
          name: "course_id",
          options: (response.data ?? []).map((course) => ({
            value: course.id,
            text: course.id,
          })),
        },
      ]);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleNew = () => {
    setModalMode("insert");
    setModalOpen(true);
  };

  const handleEdit = async (studentId) => {
    setModalMode("edit");
    setModalOpen(true);
    setStudentId(studentId);

    try {
      const response = await Students.getStudentsById(studentId);

      if (
        !response ||
        response.error ||
        !Array.isArray(response.data) ||
        response.data.length === 0
      ) {
        resetStates();
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo cargar el estudiante. Intente nuevamente.",
        });
        return;
      }

      const student = response.data[0];
      // Se clonan los campos para no mutar studentsFields (evita que datos de
      // una edición queden pre-cargados en un siguiente insert). El "id" es la
      // PK de la tabla students (coincide con el code de v_students) y solo se
      // puede asignar al crear; al editar queda de solo lectura.
      setFields(
        studentsFields.map((field) => ({
          ...field,
          value: student[field.name] ?? "",
          disabled: field.name === "id",
        })),
      );
    } catch (error) {
      console.error(error);
      resetStates();
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo cargar el estudiante. Intente nuevamente.",
      });
    }
  };

  const handleDelete = async (id) => {
    Swal.fire({
      text: "¿Está seguro de que desea eliminar el registro?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#009c0d",
      cancelButtonColor: "#d33",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        await Students.deleteStudents(id);
        await fetchData();
      }
    });
  };

  const handleModalSubmit = async (form) => {
    switch (modalMode) {
      case "insert":
        await Students.createStudents(form);
        break;
      case "edit":
        await Students.updateStudents(form, studentId);
        break;
    }

    resetStates();
    await fetchData();
  };

  const handleModalClose = async () => {
    resetStates();
    await fetchData();
  };

  // PR6: reenvio real de la confirmacion por fila (solo estudiantes con
  // correo y sin vincular). La RPC admin revoca la invitacion pendiente y
  // emite un proof nuevo; el envio reutiliza la edge function del portal.
  // Los flags de la vista no cambian (invite_pending sigue true, linked
  // sigue false), por lo que la lista no se recarga tras el envio.
  const handleResend = async (student) => {
    setResendingCode(student.code);
    try {
      const response = await Students.resendStudentInvite(student.code);
      if (response.error || !response.data?.ok) {
        toast.error(resendInviteError(response.data?.reason));
        return;
      }
      if (!response.sent?.ok) {
        toast.error(resendSendError(response.sent?.code));
        return;
      }
      toast.success(
        `Correo de confirmación reenviado a ${maskEmail(response.data.email)}.`,
      );
    } catch (error) {
      console.error(error);
      toast.error("No se pudo reenviar la confirmación. Intenta de nuevo.");
    } finally {
      setResendingCode(null);
    }
  };

  // Autocompleta el grado (oculto) cuando se selecciona un curso: el id del
  // curso tiene el formato "10-1" (grado-salón), por convención establecida.
  const handleFieldChange = (name, value, values) => {
    if (name === "course_id" && value) {
      return { ...values, [name]: value, grade_level: value.split("-")[0] };
    }
    return null;
  };

  useEffect(() => {
    // fetchData is async; setState runs after await (asynchronous, allowed).
    // False positive: facebook/react#34905 (fix #35732 not yet released).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    loadCourses();
  }, [fetchData, loadCourses]);

  useEffect(() => {
    const timer = setTimeout(() => {
      let filtered = students;
      if (filterCourse) {
        filtered = filtered.filter(
          (student) => student.grade === filterCourse,
        );
      }
      if (filterValue.trim()) {
        const filter = filterValue.toLowerCase();
        filtered = filtered.filter((student) => {
          return (
            student.code.toString().includes(filter) ||
            (student.number_list &&
              student.number_list.toString().includes(filter)) ||
            (student.name && student.name.toLowerCase().includes(filter)) ||
            (student.grade && student.grade.includes(filter))
          );
        });
      }
      // Orden: primero por Grado (course_id), luego por Nombre.
      filtered = [...filtered].sort((a, b) => {
        const gradeCompare = (a.grade ?? "").localeCompare(b.grade ?? "");
        if (gradeCompare !== 0) return gradeCompare;
        return (a.name ?? "").localeCompare(b.name ?? "");
      });
      setFilteredStudents(filtered);
    }, 300);
    return () => clearTimeout(timer);
  }, [filterValue, filterCourse, students]);

  return (
    <>
      <div className="container mx-auto my-16 flex w-fit min-w-[15%] max-w-[90%] flex-col items-center justify-center gap-2">
        <div className="mb-10 flex w-full gap-2">
          <input
            type="search"
            name="studentSearch"
            id="studentFilter"
            placeholder="Buscar estudiante ..."
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="w-full rounded-md border-2 border-slate-500 p-2 outline-none dark:bg-slate-800 dark:text-slate-100"
          />
          <select
            name="courseFilter"
            id="courseFilter"
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="rounded-md border-2 border-slate-500 p-2 outline-none dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">Todos los cursos</option>
            {(courseOptions[0]?.options ?? []).map((course) => (
              <option key={course.value} value={course.value}>
                {course.text}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <Loader className={"size-10"} />
        ) : (
          <>
            <div className="flex w-full items-center justify-end">
              <button
                type="button"
                className="size-8 rounded-lg border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                onClick={handleNew}
              >
                <i className="fa fa-plus" />
              </button>
            </div>

            {filteredStudents.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <Table
                  dataList={filteredStudents}
                  headers={{
                    code: "Código",
                    number_list: "No. Lista",
                    name: "Nombre",
                    grade: "Grado",
                    email: "Correo",
                    estado: "Estado",
                    invitacion: "Confirmación",
                  }}
                  onHandleEdit={handleEdit}
                  onHandleDelete={handleDelete}
                  renderers={{
                    email: (value) => value ?? "—",
                    estado: (_value, student) => (
                      <LinkStateBadge
                        linked={student.linked === true}
                        invitePending={student.invite_pending === true}
                      />
                    ),
                    invitacion: (_value, student) =>
                      student.email && !student.linked ? (
                        <button
                          type="button"
                          disabled={resendingCode === student.code}
                          onClick={() => handleResend(student)}
                          className="flex items-center gap-1 rounded-md border border-blue-500 px-2 py-1 text-xs font-medium text-blue-500 transition-colors hover:bg-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <i className="fa fa-envelope" />
                          {resendingCode === student.code
                            ? "Enviando..."
                            : "Reenviar"}
                        </button>
                      ) : (
                        "—"
                      ),
                  }}
                />
              </div>
            ) : (
              <p className="dark:text-slate-300">No hay registros</p>
            )}
          </>
        )}
      </div>
      <Modal
        modalTitle={
          modalMode === "insert" ? "Nuevo estudiante" : "Editar estudiante"
        }
        isOpen={modalOpen}
        onClose={handleModalClose}
        fields={fields}
        onSubmit={handleModalSubmit}
        optionsList={courseOptions}
        onFieldChange={handleFieldChange}
      />
    </>
  );
};

export default StudentsPage;
