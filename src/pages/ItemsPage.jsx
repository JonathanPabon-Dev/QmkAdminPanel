import { useState, useEffect } from "react";
import {
  getItems,
  getItemsById,
  createItems,
  editItems,
  deleteItems,
} from "../apis/itemsApi";
import { itemsFields } from "../constants/fields";
import Table from "../components/Table";
import Loader from "../components/Loader";
import Modal from "../components/Modal";

const ItemsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("");
  const [fields, setFields] = useState(itemsFields);

  async function fetchData() {
    setLoading(true);
    const response = await getItems();
    console.log(response);
    setItems(response.data);
    setLoading(false);
  }

  const handleNew = async () => {
    setModalMode("insert");
    console.log("Nuevo registro");
    setModalOpen(true);
  };

  const handleEdit = async (id) => {
    setModalMode("edit");
    const response = await getItemsById(id);

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
    await deleteItems(id);
    fetchData();
  };

  const handleModalSubmit = (form) => {
    const formData = {};
    const formItems = form.items;

    for (let i = 0; i < formItems.length; i++) {
      const item = formItems[i];
      if (item.id) {
        formData[item.id] = item.value;
      }
    }

    console.log("Form data:", formData);

    if (modalMode === "insert") {
      console.log("Petición insertar DB");
      // createItems(formData);
    } else if (modalMode === "edit") {
      console.log("Petición actualizar DB");
      // editItems(id, formData);
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
          items.length > 0 && (
            <>
              <div className="flex w-full items-center justify-between">
                <h2 className="text-xl font-bold uppercase">
                  Parametrización de Ítems
                </h2>
                <button
                  type="button"
                  className="size-8 rounded-lg border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                  onClick={handleNew}
                >
                  <i className="fa fa-plus" />
                </button>
              </div>
              <Table
                dataList={items}
                headers={{
                  value1: "Valor 1",
                  value2: "Valor 2",
                  topic: "Tema",
                }}
                onHandleEdit={handleEdit}
                onHandleDelete={handleDelete}
              />
            </>
          )
        )}
      </div>
      <Modal
        modalTitle={modalMode === "insert" ? "Nuevo ítem" : "Editar ítem"}
        isOpen={modalOpen}
        onClose={handleModalClose}
        fields={itemsFields}
        onSubmit={handleModalSubmit}
      />
    </>
  );
};

export default ItemsPage;
