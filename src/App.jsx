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
      <div>
        <label htmlFor="tableSelect">Tabla:</label>
        <select id="tableSelect" value={selectedTable} onChange={handleChange}>
          <option value="">Selecciona una opción</option>
          {tables.map((table, index) => (
            <option key={index} value={table.name}>
              {table.name}
            </option>
          ))}
        </select>

        {component}
      </div>
      <ToastContainer theme="dark" />
    </>
  );
};

export default App;
