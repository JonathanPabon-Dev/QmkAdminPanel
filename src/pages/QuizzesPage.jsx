import { useCallback, useState, useEffect } from "react";
import Quizzes from "../supabase/tables/quizzes";
import Questions from "../supabase/tables/questions";
import Subjects from "../supabase/tables/subjects";
import Courses from "../supabase/tables/courses";
import { quizzesFields } from "../models/fields";
import Table from "../components/Table";
import Loader from "../components/Loader";
import FormField from "../components/FormField";
import Swal from "sweetalert2";

// question_id es texto: orden alfabético ascendente.
const sortByIdAsc = (list) =>
  [...list].sort((a, b) => String(a.id).localeCompare(String(b.id)));

const QuizzesPage = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterValue, setFilterValue] = useState("");
  // Vista de detalle: formulario del quiz + "Preguntas del cuestionario"
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewMode, setViewMode] = useState(""); // "insert" | "edit"
  const [detailQuizId, setDetailQuizId] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [associatedQuestions, setAssociatedQuestions] = useState([]);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [availableSearch, setAvailableSearch] = useState("");
  // Opciones del select de Asignatura, en el formato que espera FormField.
  const [subjectOptions, setSubjectOptions] = useState([]);
  // Cursos del quiz con su ventana propia de disponibilidad.
  const [associatedCourses, setAssociatedCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  // Etapas del flujo de creación/edición. Solo la primera es obligatoria;
  // cursos y preguntas son opcionales.
  const steps = [
    { key: "basic", label: "Información básica" },
    { key: "courses", label: "Cursos" },
    { key: "questions", label: "Preguntas" },
  ];
  const [activeStep, setActiveStep] = useState(0);
  const [stepError, setStepError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await Quizzes.getQuizzes();
      // Agrega un campo de solo lectura con los cursos asociados, p.ej. "10-1, 10-2".
      const data = (response.data ?? []).map((quiz) => ({
        ...quiz,
        courses_display: (quiz.quiz_courses ?? [])
          .map((relation) => relation.course_id)
          .join(", "),
      }));
      setQuizzes(data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }, []);

  // Carga las preguntas de la sección. Con quizId presente (edición) obtiene
  // las asociadas (embedding quiz_questions) y descarta del banco las que ya
  // están asociadas; sin quizId (nuevo) todo el banco queda disponible.
  const loadQuestions = useCallback(async (quizId) => {
    setQuestionsLoading(true);
    try {
      if (quizId) {
        const [quizResponse, bankResponse] = await Promise.all([
          Quizzes.getQuizWithQuestions(quizId),
          Questions.getQuestions(),
        ]);
        if (quizResponse.error) {
          console.error(quizResponse.error);
          return;
        }
        const associatedIds = new Set(
          (quizResponse.data?.[0]?.quiz_questions ?? []).map(
            (relation) => relation.question_id,
          ),
        );
        const bank = bankResponse.data ?? [];
        setAssociatedQuestions(
          sortByIdAsc(
            bank.filter((question) => associatedIds.has(question.id)),
          ),
        );
        setAvailableQuestions(
          sortByIdAsc(
            bank.filter((question) => !associatedIds.has(question.id)),
          ),
        );
      } else {
        const bankResponse = await Questions.getQuestions();
        setAssociatedQuestions([]);
        setAvailableQuestions(sortByIdAsc(bankResponse.data ?? []));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  const loadSubjects = useCallback(async () => {
    try {
      const response = await Subjects.getSubjects();
      setSubjectOptions([
        {
          name: "subject_id",
          options: (response.data ?? []).map((subject) => ({
            value: subject.id,
            text: subject.name,
          })),
        },
      ]);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const loadCourses = useCallback(async () => {
    try {
      const response = await Courses.getCourses();
      return response.data ?? [];
    } catch (error) {
      console.error(error);
      return [];
    }
  }, []);

  const handleNew = async () => {
    const initialValues = {};
    quizzesFields.forEach((field) => {
      initialValues[field.name] = field.value;
    });
    setViewMode("insert");
    setDetailQuizId(null);
    setFormValues(initialValues);
    setAssociatedCourses([]);
    setAvailableCourses(await loadCourses());
    setSelectedCourse("");
    setActiveStep(0);
    setStepError("");
    setDetailOpen(true);
    await loadSubjects();
    await loadQuestions(null);
  };

  const handleEdit = async (id) => {
    const response = await Quizzes.getQuizById(id);
    if (response.error) {
      console.error(response.error);
      return;
    }
    const quiz = response.data[0];
    const values = {};
    quizzesFields.forEach((field) => {
      values[field.name] = quiz[field.name];
    });
    // El curso y su ventana de disponibilidad no viven en quizzes: viven en
    // quiz_courses (uno por curso con su ventana propia).
    const associated = (quiz.quiz_courses ?? []).map((relation) => ({
      course_id: relation.course_id,
      available_since: relation.available_since ?? "",
      available_until: relation.available_until ?? "",
      available_since_time: relation.available_since_time ?? "",
      available_until_time: relation.available_until_time ?? "",
    }));
    const courses = await loadCourses();
    const associatedIds = new Set(associated.map((c) => c.course_id));
    setAssociatedCourses(associated);
    setAvailableCourses(courses.filter((c) => !associatedIds.has(c.id)));
    setSelectedCourse("");
    setViewMode("edit");
    setDetailQuizId(id);
    setFormValues(values);
    setActiveStep(0);
    setStepError("");
    setDetailOpen(true);
    await loadSubjects();
    await loadQuestions(id);
  };

  // Consulta: misma carga del detalle que edición, pero todo el formulario
  // queda bloqueado (campos, cursos y preguntas en solo lectura).
  const handleView = async (id) => {
    const response = await Quizzes.getQuizById(id);
    if (response.error) {
      console.error(response.error);
      return;
    }
    const quiz = response.data[0];
    const values = {};
    quizzesFields.forEach((field) => {
      values[field.name] = quiz[field.name];
    });
    const associated = (quiz.quiz_courses ?? []).map((relation) => ({
      course_id: relation.course_id,
      available_since: relation.available_since ?? "",
      available_until: relation.available_until ?? "",
      available_since_time: relation.available_since_time ?? "",
      available_until_time: relation.available_until_time ?? "",
    }));
    const courses = await loadCourses();
    const associatedIds = new Set(associated.map((c) => c.course_id));
    setAssociatedCourses(associated);
    setAvailableCourses(courses.filter((c) => !associatedIds.has(c.id)));
    setSelectedCourse("");
    setViewMode("view");
    setDetailQuizId(id);
    setFormValues(values);
    setActiveStep(0);
    setStepError("");
    setDetailOpen(true);
    await loadSubjects();
    await loadQuestions(id);
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
        await Quizzes.deleteQuizzes(id);
        await fetchData();
      }
    });
  };

  const handleInputChange = (ev) => {
    const { name, value } = ev.target;
    setFormValues((prevValues) => ({ ...prevValues, [name]: value }));
  };

  // Agrega un curso de disponible -> asociado. La ventana de disponibilidad
  // (fechas/horas) se define por curso en la pestaña "Cursos".
  const handleAddCourse = () => {
    if (!selectedCourse) return;
    const course = availableCourses.find((c) => c.id === selectedCourse);
    if (!course) return;
    setAssociatedCourses((prev) => [
      ...prev,
      {
        course_id: course.id,
        available_since: "",
        available_until: "",
        available_since_time: "",
        available_until_time: "",
      },
    ]);
    setAvailableCourses((prev) =>
      prev.filter((c) => c.id !== course.id),
    );
    setSelectedCourse("");
  };

  const handleRemoveCourse = (courseId) => {
    const course = associatedCourses.find((c) => c.course_id === courseId);
    if (!course) return;
    setAssociatedCourses((prev) =>
      prev.filter((c) => c.course_id !== courseId),
    );
    setAvailableCourses((prev) =>
      [...prev, { id: courseId }].sort((a, b) =>
        String(a.id).localeCompare(String(b.id)),
      ),
    );
  };

  const handleCourseWindowChange = (courseId, field, value) => {
    setAssociatedCourses((prev) =>
      prev.map((c) =>
        c.course_id === courseId ? { ...c, [field]: value } : c,
      ),
    );
  };

  const handleAddQuestion = async (question) => {
    // Nuevo quiz: la relación se aplica al guardar (el quiz aún no existe).
    if (viewMode === "insert") {
      setAvailableQuestions((prev) =>
        prev.filter((item) => item.id !== question.id),
      );
      setAssociatedQuestions((prev) => sortByIdAsc([...prev, question]));
      return;
    }
    const response = await Quizzes.addQuestionToQuiz(detailQuizId, question.id);
    if (response.error) {
      return;
    }
    setAvailableQuestions((prev) =>
      prev.filter((item) => item.id !== question.id),
    );
    setAssociatedQuestions((prev) => sortByIdAsc([...prev, question]));
  };

  const handleRemoveQuestion = async (question) => {
    if (viewMode === "insert") {
      setAssociatedQuestions((prev) =>
        prev.filter((item) => item.id !== question.id),
      );
      setAvailableQuestions((prev) => sortByIdAsc([...prev, question]));
      return;
    }
    const response = await Quizzes.removeQuestionFromQuiz(
      detailQuizId,
      question.id,
    );
    if (response.error) {
      return;
    }
    setAssociatedQuestions((prev) =>
      prev.filter((item) => item.id !== question.id),
    );
    setAvailableQuestions((prev) => sortByIdAsc([...prev, question]));
  };

  function resetDetail() {
    setDetailOpen(false);
    setViewMode("");
    setDetailQuizId(null);
    setFormValues({});
    setAssociatedQuestions([]);
    setAvailableQuestions([]);
    setAvailableSearch("");
    setAssociatedCourses([]);
    setAvailableCourses([]);
    setSelectedCourse("");
    setActiveStep(0);
    setStepError("");
    setFilterValue("");
  }

  // Aguardar la etapa obligatoria (Información básica) antes de avanzar. Las
  // etapas de Cursos y Preguntas son opcionales y no bloquean la navegación.
  // En consulta no se valida: solo se navega para revisar.
  const canAdvance = () => {
    if (activeStep !== 0 || viewMode === "view") return true;
    const missing = quizzesFields
      .filter((field) => field.required)
      .some((field) => !String(formValues[field.name] ?? "").trim());
    if (missing) {
      setStepError("Complete los campos obligatorios de Información básica para continuar.");
      return false;
    }
    setStepError("");
    return true;
  };

  const handleNext = () => {
    if (!canAdvance()) return;
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handlePrev = () => {
    setStepError("");
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    // Modo consulta: nunca persiste ni muta, solo cierra el detalle.
    if (viewMode === "view") {
      resetDetail();
      return;
    }
    // La configuración de cursos (con su ventana de disponibilidad) vive
    // íntegramente en quiz_courses; quizzes no conserva curso ni fechas legacy.
    if (viewMode === "insert") {
      const response = await Quizzes.createQuizzes(formValues);
      if (response.status === 201) {
        await Quizzes.syncQuizCourses(formValues.id, associatedCourses);
        for (const question of associatedQuestions) {
          await Quizzes.addQuestionToQuiz(formValues.id, question.id);
        }
        resetDetail();
        await fetchData();
      }
      return;
    }
    await Quizzes.updateQuizzes(formValues, detailQuizId);
    await Quizzes.syncQuizCourses(detailQuizId, associatedCourses);
    resetDetail();
    await fetchData();
  };

  const handleCancel = async () => {
    resetDetail();
    await fetchData();
  };

  useEffect(() => {
    // fetchData is async; setState runs after await (asynchronous, allowed).
    // False positive: facebook/react#34905 (fix #35732 not yet released).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!filterValue.trim()) {
        setFilteredQuizzes(quizzes);
        return;
      }
      const inputValue = filterValue.toLowerCase();
      const filtered = quizzes.filter((quiz) => {
        return (
          (quiz.id && quiz.id.toLowerCase().includes(inputValue)) ||
          (quiz.topic && quiz.topic.toLowerCase().includes(inputValue))
        );
      });
      setFilteredQuizzes(filtered);
    }, 300);
    return () => clearTimeout(timer);
  }, [filterValue, quizzes]);

  // Preguntas disponibles ya filtradas por el buscador (ID o texto).
  const filteredAvailable = availableSearch.trim()
    ? availableQuestions.filter((question) => {
        const search = availableSearch.toLowerCase();
        return (
          (question.id &&
            question.id.toLowerCase().includes(search)) ||
          (question.question_text &&
            question.question_text.toLowerCase().includes(search))
        );
      })
    : availableQuestions;

  // Consulta: todo el detalle queda en solo lectura.
  const isReadOnly = viewMode === "view";

  return (
    <>
      <div className="container mx-auto my-16 flex w-fit min-w-[15%] max-w-[90%] flex-col items-center justify-center gap-2">
        {detailOpen ? (
          <div className="flex w-full flex-col gap-4">
            <h2 className="text-xl font-bold uppercase dark:text-slate-100">
              {viewMode === "insert"
                ? "Nuevo quiz"
                : viewMode === "view"
                  ? "Ver quiz"
                  : "Editar quiz"}
            </h2>
            <form
              onSubmit={handleSave}
              className="flex w-full max-w-4xl flex-col gap-4 rounded-xl bg-white p-4 shadow-md dark:bg-gray-800"
            >
              <ol className="flex flex-wrap items-center gap-2">
                {steps.map((step, index) => {
                  const isActive = index === activeStep;
                  const isDone =
                    index < activeStep ||
                    (index === 1 && associatedCourses.length > 0) ||
                    (index === 2 && associatedQuestions.length > 0);
                  return (
                    <li key={step.key} className="flex items-center gap-2">
                      <span
                        className={`flex size-7 items-center justify-center rounded-full border-2 text-xs font-bold ${
                          isDone
                            ? "border-green-500 bg-green-500 text-white"
                            : isActive
                              ? "border-primary-600 bg-primary-600 text-white"
                              : "border-gray-300 text-gray-500 dark:border-gray-600 dark:text-slate-400"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span
                        className={`flex items-center gap-1 text-sm font-semibold ${
                          isActive
                            ? "text-primary-600 dark:text-primary-400"
                            : "text-gray-500 dark:text-slate-400"
                        }`}
                      >
                        {isDone && (
                          <i className="fa fa-check text-xs text-green-500" />
                        )}
                        {step.label}
                      </span>
                      {index < steps.length - 1 && (
                        <i className="fa fa-chevron-right text-xs text-gray-300 dark:text-gray-600" />
                      )}
                    </li>
                  );
                })}
              </ol>

              {stepError && (
                <p className="rounded-lg border-2 border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {stepError}
                </p>
              )}

              {activeStep === 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {quizzesFields.map((field) => (
                    <FormField
                      key={field.name}
                      field={field}
                      value={formValues[field.name]}
                      onChange={handleInputChange}
                      disabled={
                        isReadOnly ||
                        (viewMode === "edit" && field.name === "id")
                      }
                      optionsList={subjectOptions}
                    />
                  ))}
                </div>
              )}

              {activeStep === 1 && (
                <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-600">
                  <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
                    Cursos y disponibilidad
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Cada curso asociado tiene su propia ventana: en qué fecha y
                    hora queda disponible el cuestionario.
                  </p>

                  <div className="flex gap-2">
                    <select
                      name="associatedCourse"
                      id="associatedCourse"
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      disabled={isReadOnly}
                      className="w-full rounded-md border-2 border-slate-500 bg-white p-2 outline-none dark:bg-slate-800 dark:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="">
                        {isReadOnly
                          ? "Solo lectura"
                          : "Seleccione un curso ..."}
                      </option>
                      {availableCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.id}
                        </option>
                      ))}
                    </select>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={handleAddCourse}
                        disabled={!selectedCourse}
                        className="rounded-lg border-2 border-green-500 px-4 py-2 text-sm font-semibold text-green-500 hover:bg-green-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Agregar
                      </button>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                    Cursos asociados
                  </h4>
                  {associatedCourses.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                      <table className="w-full table-auto text-left text-sm text-gray-500 dark:text-gray-400">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
                          <tr>
                            <th scope="col" className="px-4 py-2">
                              Curso
                            </th>
                            <th scope="col" className="px-4 py-2">
                              Fecha Desde
                            </th>
                            <th scope="col" className="px-4 py-2">
                              Hora Desde
                            </th>
                            <th scope="col" className="px-4 py-2">
                              Fecha Hasta
                            </th>
                            <th scope="col" className="px-4 py-2">
                              Hora Hasta
                            </th>
                            <th scope="col" className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {associatedCourses.map((course) => (
                            <tr
                              key={course.course_id}
                              className="border-b bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-900"
                            >
                              <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                                {course.course_id}
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="date"
                                  name={`since_${course.course_id}`}
                                  value={course.available_since}
                                  onChange={(e) =>
                                    handleCourseWindowChange(
                                      course.course_id,
                                      "available_since",
                                      e.target.value,
                                    )
                                  }
                                  disabled={isReadOnly}
                                  className="w-full rounded-md border-2 border-slate-500 p-1 outline-none dark:bg-slate-800 dark:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="time"
                                  name={`sinceTime_${course.course_id}`}
                                  value={course.available_since_time}
                                  onChange={(e) =>
                                    handleCourseWindowChange(
                                      course.course_id,
                                      "available_since_time",
                                      e.target.value,
                                    )
                                  }
                                  disabled={isReadOnly}
                                  className="w-full rounded-md border-2 border-slate-500 p-1 outline-none dark:bg-slate-800 dark:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="date"
                                  name={`until_${course.course_id}`}
                                  value={course.available_until}
                                  onChange={(e) =>
                                    handleCourseWindowChange(
                                      course.course_id,
                                      "available_until",
                                      e.target.value,
                                    )
                                  }
                                  disabled={isReadOnly}
                                  className="w-full rounded-md border-2 border-slate-500 p-1 outline-none dark:bg-slate-800 dark:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="time"
                                  name={`untilTime_${course.course_id}`}
                                  value={course.available_until_time}
                                  onChange={(e) =>
                                    handleCourseWindowChange(
                                      course.course_id,
                                      "available_until_time",
                                      e.target.value,
                                    )
                                  }
                                  disabled={isReadOnly}
                                  className="w-full rounded-md border-2 border-slate-500 p-1 outline-none dark:bg-slate-800 dark:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                              </td>
                              <td className="px-4 py-2 text-right">
                                {!isReadOnly && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveCourse(course.course_id)
                                    }
                                    className="rounded-lg border-2 border-red-400 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-400 hover:text-white"
                                  >
                                    Quitar
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No hay cursos asociados
                    </p>
                  )}
                </div>
              )}

              {activeStep === 2 && (
                <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-600">
                  <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
                    Preguntas del cuestionario
                  </h3>
                  {questionsLoading ? (
                    <Loader className={"size-8"} />
                  ) : (
                    <>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                        Asociadas
                      </h4>
                      {associatedQuestions.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600">
                          <table className="w-full table-auto text-left text-sm text-gray-500 dark:text-gray-400">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
                              <tr>
                                <th scope="col" className="px-4 py-2">
                                  ID
                                </th>
                                <th scope="col" className="px-4 py-2">
                                  Pregunta
                                </th>
                                {!isReadOnly && (
                                  <th scope="col" className="px-4 py-2"></th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {associatedQuestions.map((question) => (
                                <tr
                                  key={question.id}
                                  className="border-b bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-900"
                                >
                                  <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                                    {question.id}
                                  </td>
                                  <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                                    {question.question_text}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {!isReadOnly && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveQuestion(question)
                                        }
                                        className="rounded-lg border-2 border-red-400 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-400 hover:text-white"
                                      >
                                        Quitar
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          No hay preguntas asociadas
                        </p>
                      )}

                      {!isReadOnly && (
                        <>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                            Disponibles
                          </h4>
                          <input
                            type="search"
                            name="availableSearch"
                            id="availableSearch"
                            placeholder="Buscar por ID o texto ..."
                            value={availableSearch}
                            onChange={(e) => setAvailableSearch(e.target.value)}
                            className="w-full rounded-md border-2 border-slate-500 p-2 outline-none dark:bg-slate-800 dark:text-slate-100"
                          />
                          {filteredAvailable.length > 0 ? (
                            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600">
                              <table className="w-full table-auto text-left text-sm text-gray-500 dark:text-gray-400">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
                                  <tr>
                                    <th scope="col" className="px-4 py-2">
                                      ID
                                    </th>
                                    <th scope="col" className="px-4 py-2">
                                      Pregunta
                                    </th>
                                    <th scope="col" className="px-4 py-2"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredAvailable.map((question) => (
                                    <tr
                                      key={question.id}
                                      className="border-b bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-900"
                                    >
                                      <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                                        {question.id}
                                      </td>
                                      <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                                        {question.question_text}
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleAddQuestion(question)
                                          }
                                          className="rounded-lg border-2 border-green-500 px-3 py-1 text-xs font-semibold text-green-500 hover:bg-green-500 hover:text-white"
                                        >
                                          Agregar
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {availableQuestions.length > 0
                                ? "Sin resultados para tu búsqueda"
                                : "No hay preguntas disponibles en el banco"}
                            </p>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 dark:border-gray-600">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={activeStep === 0}
                    className="rounded-lg border-2 border-gray-400 px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-400 hover:text-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 disabled:hover:bg-transparent disabled:hover:text-gray-300 dark:border-gray-600 dark:text-slate-400 dark:hover:bg-gray-600 dark:hover:text-white dark:disabled:border-gray-700 dark:disabled:text-gray-600 dark:disabled:hover:bg-transparent dark:disabled:hover:text-gray-600"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={activeStep === steps.length - 1}
                    className="rounded-lg border-2 border-primary-600 px-4 py-2 text-sm font-semibold text-primary-600 hover:bg-primary-600 hover:text-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 disabled:hover:bg-transparent disabled:hover:text-gray-300 dark:disabled:border-gray-700 dark:disabled:text-gray-600 dark:disabled:hover:bg-transparent dark:disabled:hover:text-gray-600"
                  >
                    Siguiente
                  </button>
                </div>
                <div className="flex gap-2">
                  {!isReadOnly && (
                    <button
                      type="submit"
                      className="rounded-lg border-2 border-green-500 px-4 py-2 text-sm font-semibold text-green-500 hover:bg-green-500 hover:text-white"
                    >
                      Guardar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded-lg border-2 border-red-400 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-400 hover:text-white"
                  >
                    {isReadOnly ? "Cerrar" : "Cancelar"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <>
            <div className="mb-10 flex w-full">
              <input
                type="search"
                name="quizSearch"
                id="quizFilter"
                placeholder="Buscar prueba/quiz ..."
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="w-full rounded-md border-2 border-slate-500 p-2 outline-none dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            {loading ? (
              <Loader className={"size-10"} />
            ) : (
              <>
                <div className="flex w-full items-center justify-between">
                  <h2 className="text-xl font-bold uppercase dark:text-slate-100">
                    Prueba/Quiz
                  </h2>
                  <button
                    type="button"
                    className="size-8 rounded-lg border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                    onClick={handleNew}
                  >
                    <i className="fa fa-plus" />
                  </button>
                </div>

                {filteredQuizzes.length > 0 ? (
                  <div className="w-full overflow-x-auto">
                    <Table
                      dataList={filteredQuizzes}
                      headers={{
                        id: "ID",
                        topic: "Tema",
                        courses_display: "Cursos",
                        subject_id: "Asignatura",
                        question_count: "Nº Preguntas",
                        duration_seconds: "Duración",
                      }}
                      onHandleEdit={handleEdit}
                      onHandleView={handleView}
                      onHandleDelete={handleDelete}
                    />
                  </div>
                ) : (
                  <p className="dark:text-slate-300">No hay registros</p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default QuizzesPage;
