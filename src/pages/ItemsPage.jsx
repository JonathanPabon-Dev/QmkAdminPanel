import { useCallback, useState, useEffect } from "react";
import Items from "../supabase/tables/items";
import { itemsFields } from "../models/fields";
import Table from "../components/Table";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import Swal from "sweetalert2";

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await Items.getItems();
      setItems(response.data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }, []);

  const handleNew = () => {
    setModalMode("insert");
    setModalOpen(true);
  };

  const handleEdit = async (id) => {
    setModalMode("edit");
    setModalOpen(true);
    setItemId(id);

    const response = await Items.getItemsById(id);
    const item = response.data[0];

    const fieldsTmp = [...fields];
    fieldsTmp.forEach((field) => {
      field.value = item[field.name];
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
        await Items.deleteItem(id);
        await fetchData();
      }
    });
  };

  const handleModalSubmit = async (form) => {
    switch (modalMode) {
      case "insert":
        await Items.createItems(form);
        break;
      case "edit":
        await Items.updateItems(form, itemId);
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
    // fetchData is async; setState runs after await (asynchronous, allowed).
    // False positive: facebook/react#34905 (fix #35732 not yet released).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  return (
    <>
      <div className="container mx-auto my-16 flex w-fit max-w-[90%] flex-col items-center justify-center gap-2">
        {loading ? (
          <Loader className={"size-10"} />
        ) : (
          items.length > 0 && (
            <>
              <div className="flex w-full items-center justify-between">
                <h2 className="text-xl font-bold uppercase dark:text-slate-100">Ítems</h2>
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
                  dataList={items}
                  headers={{
                    value1: "Valor 1",
                    value2: "Valor 2",
                    topic: "Tema",
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
