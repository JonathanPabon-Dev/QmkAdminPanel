import { useState, useEffect } from "react";
import Quizzes from "../supabase/tables/quizzes";
import { quizzesFields } from "../models/fields";
import Table from "../components/Table";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import Swal from "sweetalert2";

const QuizzesPage = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("");
  const [fields, setFields] = useState(quizzesFields);
  const [quizId, setQuizId] = useState(null);
  const [filterValue, setFilterValue] = useState("");

  function resetStates() {
    setQuizzes([]);
    setLoading(false);
    setModalOpen(false);
    setModalMode("");
    setFields(quizzesFields);
    setQuizId(null);
    setFilterValue("");
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await Quizzes.getQuizzes();
      setQuizzes(response.data);
      setLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleNew = () => {
    setModalMode("insert");
    setModalOpen(true);
  };

  const handleEdit = async (id) => {
    setModalMode("edit");
    setModalOpen(true);
    setQuizId(id);

    const response = await Quizzes.getQuizById(id);
    const quiz = response.data[0];

    const fieldsTmp = [...fields];
    fieldsTmp.forEach((field) => {
      field.value = quiz[field.name];
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
        await Quizzes.deleteQuizzes(id);
        await fetchData();
      }
    });
  };

  const handleModalSubmit = async (form) => {
    switch (modalMode) {
      case "insert":
        await Quizzes.createQuizzes(form);
        break;
      case "edit":
        await Quizzes.updateQuizzes(form, quizId);
        break;
    }

    resetStates();
    await fetchData();
  };

  const handleModalClose = async () => {
    resetStates();
    await fetchData();
  };

  useEffect(() => {
    resetStates();
    fetchData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!filterValue.trim()) {
        setFilteredQuizzes(quizzes);
        return;
      }
      const inputValue = filterValue.toLowerCase();
      const filtered = quizzes.filter((quiz) => {
        return (
          (quiz.quiz_id && quiz.quiz_id.toLowerCase().includes(inputValue)) ||
          (quiz.grade_level && quiz.grade.includes(inputValue))
        );
      });
      setFilteredQuizzes(filtered);
    }, 300);
    return () => clearTimeout(timer);
  }, [filterValue, quizzes]);

  return (
    <>
      <div className="container mx-auto my-16 flex w-fit min-w-[15%] max-w-[90%] flex-col items-center justify-center gap-2">
        <div className="mb-10 flex w-full">
          <input
            type="search"
            name="quizSearch"
            id="quizFilter"
            placeholder="Buscar prueba/quiz ..."
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="w-full rounded-md border-2 border-slate-500 p-2 outline-none dark:bg-slate-800"
          />
        </div>
        {loading ? (
          <Loader className={"size-10"} />
        ) : (
          <>
            <div className="flex w-full items-center justify-between">
              <h2 className="text-xl font-bold uppercase">Prueba/Quiz</h2>
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
              <p>No hay registros</p>
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
      />
    </>
  );
};

export default QuizzesPage;
