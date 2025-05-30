import { useState, useEffect } from "react";
import Questions from "../supabase/tables/questions";
import { questionsFields } from "../models/fields";
import Table from "../components/Table";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import Swal from "sweetalert2";
import Quizzes from "../supabase/tables/quizzes";

const QuestionsPage = () => {
  const correctOptionsList = [
    { value: "1", text: "1" },
    { value: "2", text: "2" },
    { value: "3", text: "3" },
    { value: "4", text: "4" },
  ];
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [optionsList, setOptionsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("");
  const [fields, setFields] = useState(questionsFields);
  const [questionId, setQuestionId] = useState(null);
  const [filterValue, setFilterValue] = useState("");

  function resetStates() {
    setQuestions([]);
    setLoading(false);
    setModalOpen(false);
    setModalMode("");
    setFields(questionsFields);
    setQuestionId(null);
    setFilterValue("");
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await Questions.getQuestions();
      setQuestions(response.data);

      const quizzes = await Quizzes.getQuizzes();
      const quizzesData = quizzes.data;
      const quizzesList = quizzesData.map((quiz) => {
        return {
          value: quiz.id,
          text: quiz.id + " | " + quiz.topic,
        };
      });
      setOptionsList([
        { name: "quiz_id", options: quizzesList },
        { name: "correct_option", options: correctOptionsList },
      ]);

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
        await Questions.deleteQuestions(id);
        await fetchData();
      }
    });
  };

  const handleModalSubmit = async (form) => {
    const tempId = form.id;
    switch (modalMode) {
      case "insert":
        form.id = "P-" + form.quiz_id.split("-")[1] + "-" + tempId;
        console.log(form.id);
        await Questions.createQuestions(form);
        break;
      case "edit":
        await Questions.updateQuestions(form, questionId);
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
        setFilteredQuestions(questions);
        return;
      }
      const inputValue = filterValue.toLowerCase();
      const filtered = questions.filter((question) => {
        return (
          (question.id && question.id.toLowerCase().includes(inputValue)) ||
          (question.question_text &&
            question.question_text.toLowerCase().includes(inputValue)) ||
          (question.quiz_id &&
            question.quiz_id.toLowerCase().includes(inputValue))
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
            className="w-full rounded-md border-2 border-slate-500 p-2 outline-none dark:bg-slate-800"
          />
        </div>
        {loading ? (
          <Loader className={"size-10"} />
        ) : (
          <>
            <div className="flex w-full items-center justify-between">
              <h2 className="text-xl font-bold uppercase">Preguntas</h2>
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
                    quiz_id: "Quiz",
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
          modalMode === "insert" ? "Nueva pregunta" : "Editar pregunta"
        }
        isOpen={modalOpen}
        onClose={handleModalClose}
        fields={fields}
        onSubmit={handleModalSubmit}
        optionsList={optionsList}
      />
    </>
  );
};

export default QuestionsPage;
