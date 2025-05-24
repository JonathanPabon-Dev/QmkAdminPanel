import { useState, useEffect } from "react";
import Students from "../supabase/tables/students";
import { studentsFields } from "../models/fields";
import Table from "../components/Table";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import Swal from "sweetalert2";

const StudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("");
  const [fields, setFields] = useState(studentsFields);
  const [studentId, setStudentId] = useState(null);
  const [filterValue, setFilterValue] = useState("");

  function resetStates() {
    setStudents([]);
    setLoading(false);
    setModalOpen(false);
    setModalMode("");
    setFields(studentsFields);
    setStudentId(null);
    setFilterValue("");
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await Students.getStudents();
      setStudents(response.data);
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
    setStudentId(id);

    const response = await Students.getStudentsById(id);
    const student = response.data[0];

    const fieldsTmp = [...fields];
    fieldsTmp.forEach((field) => {
      field.value = student[field.name];
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

  useEffect(() => {
    resetStates();
    fetchData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!filterValue.trim()) {
        setFilteredStudents(students);
        return;
      }
      const filtered = students.filter((student) => {
        const filter = filterValue.toLowerCase();
        return (
          student.id.toString().includes(filter) ||
          (student.first_name &&
            student.first_name.toLowerCase().includes(filter)) ||
          (student.fsecond_name &&
            student.second_name.toLowerCase().includes(filter)) ||
          (student.first_lastname &&
            student.first_lastname.toLowerCase().includes(filter)) ||
          (student.second_lastname &&
            student.second_lastname.toLowerCase().includes(filter)) ||
          (student.grade && student.grade.includes(filter))
        );
      });
      setFilteredStudents(filtered);
    }, 300);
    return () => clearTimeout(timer);
  }, [filterValue, students]);

  return (
    <>
      <div className="container mx-auto my-16 flex w-fit min-w-[15%] max-w-[90%] flex-col items-center justify-center gap-2">
        <div className="mb-10 flex w-full">
          <input
            type="search"
            name="studentSearch"
            id="studentFilter"
            placeholder="Buscar estudiante ..."
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="w-full rounded-md border-2 border-slate-500 p-2 outline-none"
          />
        </div>
        {loading ? (
          <Loader className={"size-10"} />
        ) : (
          <>
            <div className="flex w-full items-center justify-between">
              <h2 className="text-xl font-bold uppercase">Estudiantes</h2>
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
                    id: "Código",
                    first_name: "Primer Nombre",
                    second_name: "Segundo Nombre",
                    first_lastname: "Primer Apellido",
                    second_lastname: "Segundo Apellido",
                    grade_level: "Grado",
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

export default StudentsPage;
