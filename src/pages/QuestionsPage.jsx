import { useCallback, useState, useEffect, useRef } from "react";
import Questions from "../supabase/tables/questions";
import { questionsFields } from "../models/fields";
import Table from "../components/Table";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

const correctOptionsList = [
  { value: "1", text: "1" },
  { value: "2", text: "2" },
  { value: "3", text: "3" },
  { value: "4", text: "4" },
];

// Renders the field text and, when present, its thumbnail below it.
// The image column name derives from the field (question_image_url,
// option_1_image_url...).
const makeTextWithImageRenderer = (imageKey, altText) => (text, row) => (
  <>
    {text}
    {row[imageKey] && (
      <img
        src={row[imageKey]}
        alt={altText}
        className="mt-1 max-h-16 rounded border border-gray-300 dark:border-gray-600"
      />
    )}
  </>
);

const QuestionsPage = () => {
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("");
  const [fields, setFields] = useState(questionsFields);
  const [questionId, setQuestionId] = useState(null);
  const [filterValue, setFilterValue] = useState("");
  // URLs de imágenes quitadas en el modal; se borran del bucket SÓLO cuando
  // el guardado llega a buen fin (si se cancela, la DB aún las referencia).
  const pendingRemovalsRef = useRef(new Set());

  function resetStates() {
    setQuestions([]);
    setLoading(false);
    setModalOpen(false);
    setModalMode("");
    setFields(questionsFields);
    setQuestionId(null);
    setFilterValue("");
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await Questions.getQuestions();
      setQuestions(response.data);

      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }, []);

  const handleNew = () => {
    pendingRemovalsRef.current = new Set();
    setModalMode("insert");
    setModalOpen(true);
  };

  const handleEdit = async (id) => {
    pendingRemovalsRef.current = new Set();
    setModalMode("edit");
    setModalOpen(true);
    setQuestionId(id);

    const response = await Questions.getQuestionById(id);
    const question = response.data[0];

    const fieldsTmp = [...fields];
    fieldsTmp.forEach((field) => {
      field.value = question[field.name];
    });
    setFields(fieldsTmp);
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
        // Se borra la pregunta completa (no solo el id) para que la limpieza
        // de imágenes del bucket pueda extraer las URLs desde el registro.
        const response = await Questions.getQuestionById(id);
        const question = response.data ? response.data[0] : null;
        await Questions.deleteQuestions(question || { id });
        await fetchData();
      }
    });
  };

  const handleModalSubmit = async (form) => {
    let response;
    switch (modalMode) {
      case "insert":
        response = await Questions.createQuestions(form);
        break;
      case "edit":
        response = await Questions.updateQuestions(form, questionId);
        break;
    }

    // Sólo un guardado confirmado autoriza el borrado físico de las imágenes
    // quitadas; si la fila no cambió, la DB aún las referencia.
    const expectedStatus = modalMode === "insert" ? 201 : 204;
    if (response && response.status === expectedStatus) {
      const removed = Array.from(pendingRemovalsRef.current);
      if (removed.length > 0) {
        const cleanup = await Questions.removeImages(removed);
        if (cleanup.error) {
          toast.warn(
            "La pregunta se guardó, pero no se pudieron borrar las imágenes quitadas."
          );
        }
      }
    }
    pendingRemovalsRef.current = new Set();

    resetStates();
    await fetchData();
  };

  const handleModalClose = async () => {
    resetStates();
    await fetchData();
  };

  // La pregunta y cada opción exigen texto O imagen; si falta ambos se
  // muestra el obligatorio.
  const validateQuestionForm = (values) => {
    const questionText = (values.question_text || "").trim();
    const questionImage = values.question_image_url || "";
    if (!questionText && !questionImage) {
      return "La pregunta es obligatoria: agrega texto o imagen.";
    }
    for (let i = 1; i <= 4; i += 1) {
      const text = (values[`option_${i}_text`] || "").trim();
      const image = values[`option_${i}_image_url`] || "";
      if (!text && !image) {
        return `La opción ${i} es obligatoria: agrega texto o imagen.`;
      }
    }
    return null;
  };

  // Uploads the new image and returns the public URL (or null on failure);
  // if the field already had an image, the replaced file is removed from the
  // bucket (best effort). The error toasts come from the table module.
  const handleFileChange = async (name, file, previousUrl) => {
    const result = await Questions.uploadOptionImage(file);
    if (result.error) return null;
    if (previousUrl && previousUrl !== result) {
      const cleanup = await Questions.removeImage(previousUrl);
      if (cleanup.error) {
        toast.warn(
          "La imagen nueva se subió, pero la anterior no pudo borrarse."
        );
      }
    }
    return result;
  };

  // Registra la imagen quitada; el borrado físico queda pendiente del guardado.
  const handleRemoveFile = (name, value) => {
    if (value && typeof value === "string") {
      pendingRemovalsRef.current.add(value);
    }
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
        setFilteredQuestions(questions);
        return;
      }
      const inputValue = filterValue.toLowerCase();
      const filtered = questions.filter((question) => {
        return (
          (question.id && question.id.toLowerCase().includes(inputValue)) ||
          (question.question_text &&
            question.question_text.toLowerCase().includes(inputValue))
        );
      });
      setFilteredQuestions(filtered);
    }, 300);
    return () => clearTimeout(timer);
  }, [filterValue, questions]);

  return (
    <>
      <div className="container mx-auto my-16 flex w-fit min-w-[15%] max-w-[90%] flex-col items-center justify-center gap-2">
        <div className="mb-10 flex w-full">
          <input
            type="search"
            name="questionSearch"
            id="questionFilter"
            placeholder="Buscar pregunta ..."
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="w-full rounded-md border-2 border-slate-500 p-2 outline-none dark:bg-slate-800 dark:text-slate-100"
          />
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

            {filteredQuestions.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <Table
                  dataList={filteredQuestions}
                  headers={{
                    id: "ID",
                    question_text: "Pregunta",
                    option_1_text: "Opción 1",
                    option_2_text: "Opción 2",
                    option_3_text: "Opción 3",
                    option_4_text: "Opción 4",
                    correct_option: "Opción Correcta",
                  }}
                  renderers={{
                    question_text: makeTextWithImageRenderer(
                      "question_image_url",
                      "Pregunta"
                    ),
                    option_1_text: makeTextWithImageRenderer(
                      "option_1_image_url",
                      "Opción 1"
                    ),
                    option_2_text: makeTextWithImageRenderer(
                      "option_2_image_url",
                      "Opción 2"
                    ),
                    option_3_text: makeTextWithImageRenderer(
                      "option_3_image_url",
                      "Opción 3"
                    ),
                    option_4_text: makeTextWithImageRenderer(
                      "option_4_image_url",
                      "Opción 4"
                    ),
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
      </div>
      <Modal
        modalTitle={
          modalMode === "insert" ? "Nueva pregunta" : "Editar pregunta"
        }
        isOpen={modalOpen}
        onClose={handleModalClose}
        fields={fields}
        onSubmit={handleModalSubmit}
        optionsList={[{ name: "correct_option", options: correctOptionsList }]}
        onFileChange={handleFileChange}
        onRemoveFile={handleRemoveFile}
        validateForm={validateQuestionForm}
      />
    </>
  );
};

export default QuestionsPage;
