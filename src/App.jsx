import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import { tables } from "./models/tables";

const THEME_STORAGE_KEY = "qmk-theme";

// Inicializa el tema desde localStorage; si no hay valor guardado (o está
// corrupto), cae al esquema de color del sistema.
const getInitialTheme = () => {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const App = () => {
  const [selectedTable, setSelectedTable] = useState(tables[0].name);
  const [theme, setTheme] = useState(getInitialTheme);
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, isDark]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const selected =
    tables.find((table) => table.name === selectedTable) ?? tables[0];
  const PageComponent = selected.component;

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-900">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Panel de Administración
          </h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-3" aria-label="Tablas">
          <ul className="flex flex-col gap-1">
            {tables.map((table) => {
              const isActive = table.name === selectedTable;
              return (
                <li key={table.name}>
                  <button
                    type="button"
                    onClick={() => setSelectedTable(table.name)}
                    aria-current={isActive ? "page" : undefined}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    }`}
                  >
                    {table.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-slate-200 p-3 dark:border-slate-700">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            className="size-8 rounded-lg border-2 border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <i className={isDark ? "fa fa-sun" : "fa fa-moon"} />
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-6">
        <PageComponent />
      </main>

      <ToastContainer theme={isDark ? "dark" : "light"} />
    </div>
  );
};

export default App;