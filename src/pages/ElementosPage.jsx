import { useState, useEffect } from "react";
import {
  getElementos,
  getElementosById,
  createElementos,
  editElementos,
  deleteElementos,
} from "../apis/elementosApi";
import { elementosFields } from "../constants/fields";
import Table from "../components/Table";
import Loader from "../components/Loader";
import Modal from "../components/Modal";

const ElementosPage = () => {
  const [elementos, setElementos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("");
  const [fields, setFields] = useState(elementosFields);

  async function fetchData() {
    setLoading(true);
    const response = await getElementos();
    setElementos(response.data);
    setLoading(false);
  }

  const handleNew = async () => {
    setModalMode("insert");
    console.log("Nuevo registro");
    setModalOpen(true);
  };

  const handleEdit = async (id) => {
    setModalMode("edit");
    const response = await getElementosById(id);

    const fieldsTmp = fields;
    fieldsTmp.forEach((field) => {
      field.value = response.data[field.name];
    });
    setFields(fieldsTmp);

    console.log("Editando el registro", id);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    console.log("Eliminando el registro", id);
    await deleteElementos(id);
    fetchData();
  };

  const handleModalSubmit = (form) => {
    const formData = {};
    const formElements = form.elements;

    for (let i = 0; i < formElements.length; i++) {
      const element = formElements[i];
      if (element.id) {
        formData[element.id] = element.value;
      }
    }

    console.log("Form data:", formData);

    if (modalMode === "insert") {
      console.log("Petición insertar DB");
    } else if (modalMode === "edit") {
      console.log("Petición actualizar DB");
    } else {
      console.log("No existe modo");
    }

    fetchData();
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setModalMode("");
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <>
      <div className="container mx-auto my-16 flex w-fit flex-col items-center justify-center gap-2">
        {loading ? (
          <Loader className={"size-10"} />
        ) : (
          elementos.length > 0 && (
            <>
              <div className="flex w-full items-center justify-between">
                <h2 className="text-xl font-bold uppercase">Tabla Periódica</h2>
                <button
                  type="button"
                  className="size-8 rounded-lg border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                  onClick={handleNew}
                >
                  <i className="fa fa-plus" />
                </button>
              </div>
              <Table
                dataList={elementos}
                headers={{ _id: "ID", nombre: "Nombre", simbolo: "Símbolo" }}
                onHandleEdit={handleEdit}
                onHandleDelete={handleDelete}
              />
            </>
          )
        )}
      </div>
      <Modal
        modalTitle={
          modalMode === "insert" ? "Nuevo elemento" : "Editar elemento"
        }
        isOpen={modalOpen}
        onClose={handleModalClose}
        fields={elementosFields}
        onSubmit={handleModalSubmit}
      />
    </>
  );
};

export default ElementosPage;
