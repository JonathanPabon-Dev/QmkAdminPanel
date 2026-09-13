import { useCallback, useState, useEffect } from "react";
import Results from "../supabase/tables/results";
import Courses from "../supabase/tables/courses";
import Loader from "../components/Loader";

// Umbral de aprobación usado para colorear la nota (6.0 sobre 10).
const PASS_SCORE = 6;

// Convierte la relación correctas/totales a nota de 1 a 10 (un decimal).
// Devuelve null cuando la relación no está disponible.
const notaFromRatio = (ratio) =>
  ratio === null || ratio === undefined ? null : (ratio * 10).toFixed(1);

const ResultsPage = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterValue, setFilterValue] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  // Opciones del select de Curso, en el formato que espera el filtro.
  const [courseOptions, setCourseOptions] = useState([]);
  // Detalle: respuestas de un (estudiante x cuestionario).
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState(null);
  const [detailQuiz, setDetailQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answersError, setAnswersError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await Results.getResults();
      const data = response.data ?? [];

      // Cuestionarios presentes en los datos, ordenados por id (alfabético).
      const quizMap = new Map();
      data.forEach((row) => {
        if (!quizMap.has(row.quiz_id)) {
          quizMap.set(row.quiz_id, {
            quiz_id: row.quiz_id,
            quiz_topic: row.quiz_topic,
          });
        }
      });
      const sortedQuizzes = [...quizMap.values()].sort((a, b) =>
        String(a.quiz_id).localeCompare(String(b.quiz_id)),
      );
      setQuizzes(sortedQuizzes);

      // Agrupa las filas por estudiante; un resultado por cuestionario.
      const studentMap = new Map();
      data.forEach((row) => {
        let student = studentMap.get(row.student_id);
        if (!student) {
          student = {
            student_id: row.student_id,
            student_number_list: row.student_number_list,
            student_name: row.student_name,
            student_grade: row.student_grade,
            results: {},
          };
          studentMap.set(row.student_id, student);
        }
        // Relación correctas/totales: el total es quiz_question_count (la
        // cantidad parametrizada "Nº Preguntas a Evaluar" del quiz), NO el
        // total de respuestas registradas para ese estudiante.
        student.results[row.quiz_id] = {
          correct: row.correct_answers,
          total: row.quiz_question_count,
        };
      });
      // Orden: primero por grado, luego por nombre.
      const sortedStudents = [...studentMap.values()].sort((a, b) => {
        const gradeCompare = (a.student_grade ?? "").localeCompare(
          b.student_grade ?? "",
        );
        if (gradeCompare !== 0) return gradeCompare;
        return (a.student_name ?? "").localeCompare(b.student_name ?? "");
      });
      setStudents(sortedStudents);
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

  // Abre el detalle y consulta las respuestas del estudiante en el quiz.
  const openDetail = async (student, quiz) => {
    setDetailStudent(student);
    setDetailQuiz(quiz);
    setAnswers([]);
    setAnswersError("");
    setAnswersLoading(true);
    setDetailOpen(true);
    try {
      const response = await Results.getAnswersByStudentQuiz(
        student.student_id,
        quiz.quiz_id,
      );
      if (response?.error) {
        console.error(response.error);
        setAnswersError("No se pudieron cargar las respuestas.");
      } else {
        setAnswers(response.data ?? []);
      }
    } catch (error) {
      console.error(error);
      setAnswersError("No se pudieron cargar las respuestas.");
    } finally {
      setAnswersLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailStudent(null);
    setDetailQuiz(null);
    setAnswers([]);
    setAnswersError("");
  };

  // Nota promedio del estudiante (1-10): suma de correctas sobre suma de
  // totales parametrizados de los cuestionarios mostrados.
  const getAverage = (student) => {
    let correctSum = 0;
    let totalSum = 0;
    quizzes.forEach((quiz) => {
      const result = student.results[quiz.quiz_id];
      if (
        result &&
        typeof result.correct === "number" &&
        typeof result.total === "number"
      ) {
        correctSum += result.correct;
        totalSum += result.total;
      }
    });
    if (totalSum === 0) return "—";
    return notaFromRatio(correctSum / totalSum);
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
          (student) => student.student_grade === filterCourse,
        );
      }
      if (filterValue.trim()) {
        const filter = filterValue.toLowerCase();
        filtered = filtered.filter((student) => {
          return (
            (student.student_number_list &&
              String(student.student_number_list).includes(filter)) ||
            (student.student_name &&
              student.student_name.toLowerCase().includes(filter))
          );
        });
      }
      setFilteredStudents(filtered);
    }, 300);
    return () => clearTimeout(timer);
  }, [filterValue, filterCourse, students]);

  // Mientras el detalle está abierto bloquea el scroll del contenido de atrás.
  useEffect(() => {
    if (!detailOpen) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [detailOpen]);

  // Cierra el detalle con la tecla Escape.
  useEffect(() => {
    if (!detailOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeDetail();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailOpen, closeDetail]);

  const scoreClass = (score) =>
    score >= PASS_SCORE
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";

  // Estado de una respuesta para la insignia del detalle.
  const getAnswerStatus = (answer) => {
    if (answer.selected_option === null) {
      return {
        label: "Sin respuesta",
        badge: "bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300",
      };
    }
    if (answer.is_correct) {
      return {
        label: "Correcta",
        badge:
          "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
      };
    }
    return {
      label: "Incorrecta",
      badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
    };
  };

  return (
    <>
      <div className="container mx-auto my-16 flex w-fit min-w-[15%] max-w-[90%] flex-col items-center justify-center gap-2">
        <h1 className="mb-6 w-full text-xl font-bold uppercase text-slate-900 dark:text-slate-100">
          Resultados
        </h1>
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
            {filteredStudents.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <div className="relative mx-auto w-fit overflow-x-auto rounded-xl shadow-md">
                  <table className="table-auto text-left text-sm text-gray-500 dark:text-gray-400">
                    <thead className="bg-gray-50 text-center text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
<tr>
                        <th scope="col" className="px-6 py-3">
                          Curso
                        </th>
                        <th scope="col" className="px-6 py-3">
                          #
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Nombre
                        </th>
                        {quizzes.map((quiz) => (
                          <th
                            key={quiz.quiz_id}
                            scope="col"
                            title={quiz.quiz_topic}
                            className="px-6 py-3"
                          >
                            {quiz.quiz_id}
                          </th>
                        ))}
                        <th scope="col" className="px-6 py-3">
                          Prom
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr
                          key={student.student_id}
                          className="border-b bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-900"
                        >
                          <td className="px-6 py-4 text-center text-slate-700 dark:text-slate-200">
                            {student.student_grade}
                          </td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-200">
                            {student.student_number_list}
                          </td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-200">
                            {student.student_name}
                          </td>
                          {quizzes.map((quiz) => {
                            const result = student.results[quiz.quiz_id];
                            const hasResult =
                              result &&
                              typeof result.correct === "number" &&
                              typeof result.total === "number";
                            if (!hasResult) {
                              return (
                                <td
                                  key={quiz.quiz_id}
                                  className="px-6 py-4 text-center"
                                >
                                  <span className="text-gray-400 dark:text-gray-500">
                                    —
                                  </span>
                                </td>
                              );
                            }
                            const ratio =
                              result.total > 0
                                ? result.correct / result.total
                                : null;
                            const nota = notaFromRatio(ratio);
                            return (
                              <td
                                key={quiz.quiz_id}
                                className="px-6 py-4 text-center"
                              >
                                <button
                                  type="button"
                                  onClick={() => openDetail(student, quiz)}
                                  title="Ver cuestionario del estudiante"
                                  className={`cursor-pointer font-semibold underline-offset-2 hover:underline ${
                                    nota === null
                                      ? "text-gray-400 dark:text-gray-500"
                                      : scoreClass(Number(nota))
                                  }`}
                                >
                                  {nota}
                                </button>
                              </td>
                            );
                          })}
                          <td className="px-6 py-4 text-center font-semibold text-slate-700 dark:text-slate-200">
                            {getAverage(student)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="dark:text-slate-300">No hay registros</p>
            )}
          </>
        )}
      </div>

      {/* Detalle del cuestionario que realizó el estudiante (solo lectura):
          las preguntas que le salieron con su estado correcta/incorrecta.
          Mismo patrón visual que QuestionViewModal: overlay fijo + tarjeta
          max-w-2xl. El Modal compartido es de formulario (fields/onSubmit)
          y no admite este contenido informativo. */}
      {detailOpen && detailStudent && detailQuiz && (
<div
          tabIndex="-1"
          onClick={closeDetail}
          className="fixed left-0 right-0 top-0 z-50 flex h-full max-h-full w-full items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900 bg-opacity-85 backdrop-blur-sm p-4 md:inset-0"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="max-h-full w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-gray-800"
          >
            <div className="flex items-center justify-between rounded-t border-b p-4 dark:border-gray-600 md:p-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                {detailStudent.student_name} — {detailQuiz.quiz_topic}
              </h3>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={closeDetail}
                className="ml-auto inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm font-bold text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
              >
                <i className="fa fa-close" />
              </button>
            </div>

            <div className="flex flex-col gap-4 p-4 md:p-5">
              {answersLoading ? (
                <div className="flex justify-center p-6">
                  <Loader className={"size-10"} />
                </div>
              ) : answersError ? (
                <p className="rounded-lg border-2 border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {answersError}
                </p>
              ) : answers.length > 0 ? (
                answers.map((answer) => {
                  const status = getAnswerStatus(answer);
                  return (
                    <div
                      key={
                        answer.id ??
                        `${answer.student_id}-${answer.question_id}`
                      }
                      className="flex flex-col gap-3 rounded-lg border-2 border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          {answer.question_id}
                        </h4>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${status.badge}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      {answer.question_text && (
                        <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                          {answer.question_text}
                        </p>
                      )}
                      {answer.question_image_url && (
                        <img
                          src={answer.question_image_url}
                          alt="Pregunta"
                          className="max-h-64 w-fit rounded-lg border border-gray-200 object-contain dark:border-gray-600"
                        />
                      )}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {[1, 2, 3, 4].map((optionNumber) => {
                          // La opción seleccionada por el estudiante lleva el
                          // borde del color de su estado (correcta/incorrecta).
                          const isSelected =
                            answer.selected_option === optionNumber;
                          const optionBorder = isSelected
                            ? answer.is_correct
                              ? "border-green-500 dark:border-green-400"
                              : "border-red-500 dark:border-red-400"
                            : "border-gray-200 dark:border-gray-600";
                          return (
                            <div
                              key={optionNumber}
                              className={`flex flex-col gap-2 rounded-lg border-2 bg-white p-3 dark:bg-gray-800 ${optionBorder}`}
                            >
                              <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Opción {optionNumber}
                              </span>
                              {answer[`option_${optionNumber}_text`] && (
                                <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                                  {answer[`option_${optionNumber}_text`]}
                                </p>
                              )}
                              {answer[`option_${optionNumber}_image_url`] && (
                                <img
                                  src={answer[`option_${optionNumber}_image_url`]}
                                  alt={`Opción ${optionNumber}`}
                                  className="max-h-40 w-fit max-w-full rounded border border-gray-200 object-contain dark:border-gray-600"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No hay respuestas registradas para este cuestionario.
                </p>
              )}

              {/* Resumen: relación correctas/totales y nota obtenida */}
              {(() => {
                const summaryResult =
                  detailStudent?.results?.[detailQuiz?.quiz_id];
                const hasSummary =
                  summaryResult &&
                  typeof summaryResult.correct === "number" &&
                  typeof summaryResult.total === "number";
                if (!hasSummary) return null;
                const ratio =
                  summaryResult.total > 0
                    ? summaryResult.correct / summaryResult.total
                    : null;
                const summaryNota = notaFromRatio(ratio);
                const summaryColor =
                  summaryNota === null
                    ? "text-gray-400 dark:text-gray-500"
                    : scoreClass(Number(summaryNota));
                return (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border-2 border-gray-300 bg-white p-4 dark:border-gray-600 dark:bg-gray-800">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Correctas:{" "}
                      <span className="font-bold">
                        {summaryResult.correct}/{summaryResult.total}
                      </span>
                    </p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Nota:{" "}
                      <span className={`font-bold ${summaryColor}`}>
                        {summaryNota}
                      </span>
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ResultsPage;
