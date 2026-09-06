import { useCallback, useState, useEffect } from "react";
import Quizzes from "../supabase/tables/quizzes";
import Questions from "../supabase/tables/questions";
import { quizzesFields } from "../models/fields";
import Table from "../components/Table";
import Loader from "../components/Loader";
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await Quizzes.getQuizzes();
      setQuizzes(response.data);
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

  const handleNew = async () => {
    const initialValues = {};
    quizzesFields.forEach((field) => {
      initialValues[field.name] = field.value;
    });
    setViewMode("insert");
    setDetailQuizId(null);
    setFormValues(initialValues);
    setDetailOpen(true);
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
    setViewMode("edit");
    setDetailQuizId(id);
    setFormValues(values);
    setDetailOpen(true);
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

  const handleAddQuestion = async (question) => {
    // Nuevo quiz: la relación se aplica al guardar (el quiz aún no existe).
    if (viewMode === "insert") {
      setAvailableQuestions((prev) =>
        prev.filter((item) => item.id !== question.id),
      );
      setAssociatedQuestions((prev) => sortByIdAsc([...prev, question]));
      return;
    }
    const response = await Quizzes.addQuestionToQuiz(
      detailQuizId,
      question.id,
    );
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
    setFilterValue("");
  }

  const handleSave = async (ev) => {
    ev.preventDefault();
    if (viewMode === "insert") {
      const response = await Quizzes.createQuizzes(formValues);
      if (response.status === 201) {
        for (const question of associatedQuestions) {
          await Quizzes.addQuestionToQuiz(formValues.id, question.id);
        }
        resetDetail();
        await fetchData();
      }
      return;
    }
    await Quizzes.updateQuizzes(formValues, detailQuizId);
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

  return (
    <>
      <div className="container mx-auto my-16 flex w-fit min-w-[15%] max-w-[90%] flex-col items-center justify-center gap-2">
        {detailOpen ? (
          <div className="flex w-full flex-col gap-4">
            <h2 className="text-xl font-bold uppercase dark:text-slate-100">
              {viewMode === "insert" ? "Nuevo quiz" : "Editar quiz"}
            </h2>
            <form
              onSubmit={handleSave}
              className="flex w-full max-w-4xl flex-col gap-4 rounded-xl bg-white p-4 shadow-md dark:bg-gray-800"
            >
              {quizzesFields.map((field) => (
                <div key={field.name}>
                  <label
                    htmlFor={field.name}
                    className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                  >
                    {field.label}
                    {field.required && "*"}
                  </label>
                  <input
                    type="text"
                    name={field.name}
                    id={field.name}
                    value={formValues[field.name] || ""}
                    onChange={handleInputChange}
                    disabled={viewMode === "edit" && field.name === "id"}
                    className="focus:ring-primary-600 focus:border-primary-600 dark:focus:ring-primary-500 dark:focus:border-primary-500 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    required={field.required}
                  />
                </div>
              ))}

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
                              <th scope="col" className="px-4 py-2"></th>
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
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveQuestion(question)
                                    }
                                    className="rounded-lg border-2 border-red-400 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-400 hover:text-white"
                                  >
                                    Quitar
                                  </button>
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

                    <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                      Disponibles
                    </h4>
                    {availableQuestions.length > 0 ? (
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
                            {availableQuestions.map((question) => (
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
                                    onClick={() => handleAddQuestion(question)}
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
                        No hay preguntas disponibles en el banco
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="submit"
                  className="rounded-lg border-2 border-green-500 px-4 py-2 text-sm font-semibold text-green-500 hover:bg-green-500 hover:text-white"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg border-2 border-red-400 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-400 hover:text-white"
                >
                  Cancelar
                </button>
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
                        grade_level: "Grado",
                        subject_id: "Asignatura",
                        available_since: "Fecha Desde",
                        available_until: "Fecha Hasta",
                      }}
                      onHandleEdit={handleEdit}
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