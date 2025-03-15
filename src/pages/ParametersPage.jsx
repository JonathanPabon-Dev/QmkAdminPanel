import { useState, useEffect } from "react";
import Parameters from "../supabase/tables/parameters";
import { parametersFields } from "../models/fields";
import Table from "../components/Table";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import Swal from "sweetalert2";

const ParametersPage = () => {
  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("");
  const [fields, setFields] = useState(parametersFields);
  const [parameterId, setParameterId] = useState(null);

  function resetStates() {
    setParameters([]);
    setLoading(false);
    setModalOpen(false);
    setModalMode("");
    setFields(parametersFields);
    setParameterId(null);
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await Parameters.getParameters();
      setParameters(response.data);
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
    setParameterId(id);

    const response = await Parameters.getParametersById(id);
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
        await Parameters.deleteParameter(id);
        await fetchData();
      }
    });
  };

  const handleModalSubmit = async (form) => {
    console.log(form);
    switch (modalMode) {
      case "insert":
        await Parameters.createParameters(form);
        break;
      case "edit":
        await Parameters.updateParameters(form, parameterId);
        break;
      default:
        console.log("No existe modo");
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
      <div className="container mx-auto my-16 flex w-fit max-w-[90%] flex-col items-center justify-center gap-2">
        {loading ? (
          <Loader className={"size-10"} />
        ) : (
          parameters.length > 0 && (
            <>
              <div className="flex w-full items-center justify-between">
                <h2 className="text-xl font-bold uppercase">Parámetros</h2>
                <button
                  type="button"
                  className="size-8 rounded-lg border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                  onClick={handleNew}
                >
                  <i className="fa fa-plus" />
                </button>
              </div>
              <div className="w-full overflow-x-auto">
                <Table
                  dataList={parameters}
                  headers={{
                    name: "Parámetro",
                    value: "Valor",
                  }}
                  onHandleEdit={handleEdit}
                  onHandleDelete={handleDelete}
                />
              </div>
            </>
          )
        )}
      </div>
      <Modal
        modalTitle={
          modalMode === "insert" ? "Nuevo parámetro" : "Editar parámetro"
        }
        isOpen={modalOpen}
        onClose={handleModalClose}
        fields={fields}
        onSubmit={handleModalSubmit}
      />
    </>
  );
};

export default ParametersPage;
