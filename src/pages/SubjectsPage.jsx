import { useState, useEffect } from "react";
import Subjects from "../supabase/tables/subjects";
import { subjectsFields } from "../models/fields";
import Table from "../components/Table";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import Swal from "sweetalert2";

const SubjectsPage = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("");
  const [fields, setFields] = useState(subjectsFields);
  const [subjectId, setSubjectId] = useState(null);

  function resetStates() {
    setSubjects([]);
    setLoading(false);
    setModalOpen(false);
    setModalMode("");
    setFields(subjectsFields);
    setSubjectId(null);
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await Subjects.getSubjects();
      setSubjects(response.data);
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
    setSubjectId(id);

    const response = await Subjects.getSubjectsById(id);
    const parameter = response.data[0];

    const fieldsTmp = [...fields];
    fieldsTmp.forEach((field) => {
      field.value = parameter[field.name];
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
        await Subjects.deleteParameter(id);
        await fetchData();
      }
    });
  };

  const handleModalSubmit = async (form) => {
    switch (modalMode) {
      case "insert":
        await Subjects.createSubjects(form);
        break;
      case "edit":
        await Subjects.updateSubjects(form, subjectId);
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

  return (
    <>
      <div className="container mx-auto my-16 flex w-fit min-w-[15%] max-w-[90%] flex-col items-center justify-center gap-2">
        {loading ? (
          <Loader className={"size-10"} />
        ) : (
          <>
            <div className="flex w-full items-center justify-between">
              <h2 className="text-xl font-bold uppercase">Asignaturas</h2>
              <button
                type="button"
                className="size-8 rounded-lg border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                onClick={handleNew}
              >
                <i className="fa fa-plus" />
              </button>
            </div>

            {subjects.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <Table
                  dataList={subjects}
                  headers={{
                    id: "Código",
                    name: "Nombre",
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
          modalMode === "insert" ? "Nueva asignatura" : "Editar asignatura"
        }
        isOpen={modalOpen}
        onClose={handleModalClose}
        fields={fields}
        onSubmit={handleModalSubmit}
      />
    </>
  );
};

export default SubjectsPage;
