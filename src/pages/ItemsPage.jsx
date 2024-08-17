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
  const [itemId, setItemId] = useState(null);

  function resetStates() {
    setItems([]);
    setLoading(false);
    setModalOpen(false);
    setModalMode("");
    setFields(itemsFields);
    setItemId(null);
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getItems();
      setItems(response.data);
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
    setItemId(id);

    const response = await getItemsById(id);
    const fieldsTmp = [...fields];
    fieldsTmp.forEach((field) => {
      field.value = response.data[field.name];
    });
    setFields(fieldsTmp);
  };

  const handleDelete = async (id) => {
    await deleteItems(id);
    await fetchData();
  };

  const handleModalSubmit = async (form) => {
    switch (modalMode) {
      case "insert":
        await createItems(form);
        break;
      case "edit":
        await editItems(itemId, form);
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
        fields={fields}
        onSubmit={handleModalSubmit}
      />
    </>
  );
};

export default ItemsPage;
