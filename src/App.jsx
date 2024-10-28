import { createElement, useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import { tables } from "./constants/tables";

const App = () => {
  const [selectedTable, setSelectedTable] = useState("");
  const [component, setComponent] = useState(null);

  const handleChange = (event) => {
    setSelectedTable(event.target.value);
  };

  useEffect(() => {
    const selected = tables.find((table) => table.name === selectedTable);
    setComponent(selected ? createElement(selected.component) : null);
  }, [selectedTable]);

  return (
    <>
      <div className="mx-auto my-16 flex w-80 flex-col items-center justify-center gap-2">
        <label htmlFor="tableSelect" className="w-full text-xl font-semibold">
          Tabla
        </label>
        <select
          id="tableSelect"
          className="w-full rounded-md border-2 border-slate-500 p-2"
          value={selectedTable}
          onChange={handleChange}
        >
          <option value="">Selecciona una opción</option>
          {tables.map((table, index) => (
            <option key={index} value={table.name}>
              {table.name}
            </option>
          ))}
        </select>
      </div>

      {component}
      <ToastContainer theme="dark" />
    </>
  );
};

export default App;
