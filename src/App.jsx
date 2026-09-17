import { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import { tables } from "./models/tables";
import { supabase } from "./supabase/client";
import Students from "./supabase/tables/students";
import LoginPage from "./pages/LoginPage";
import InvitePage, { INVITE_TOKEN_STORAGE_KEY } from "./pages/InvitePage";
import StudentPasswordPortal from "./pages/StudentPasswordPortal";
import StudentDashboard from "./pages/StudentDashboard";
import Loader from "./components/Loader";

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

// PR4: vista minima para sesiones autenticadas cuyo rol no es admin (teacher,
// student o cuenta sin fila en user_roles). No renderiza ninguna tabla del
// panel; el acceso al portal de estudiantes queda disponible. El cierre de
// sesion permite cambiar a una cuenta con permisos.
const RestrictedView = ({ email, onStudentAccess, onLogout, isDark }) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-900">
    <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <i className="fa fa-user-shield text-4xl text-slate-400" />
      <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
        Acceso restringido
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Tu cuenta no tiene permisos de administrador en el panel.
      </p>
      <p className="mt-3 truncate text-xs text-slate-400 dark:text-slate-500">
        {email}
      </p>
      <button
        type="button"
        onClick={onStudentAccess}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
      >
        <i className="fa fa-graduation-cap" />
        Entrar al portal de estudiantes
      </button>
      <button
        type="button"
        onClick={onLogout}
        className="mt-4 w-full text-center text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
      >
        Cerrar sesión
      </button>
    </div>
    <ToastContainer theme={isDark ? "dark" : "light"} />
  </div>
);

const App = () => {
  const [selectedTable, setSelectedTable] = useState(tables[0].name);
  const [theme, setTheme] = useState(getInitialTheme);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [inviteMode, setInviteMode] = useState(
    () =>
      // Hash del enlace del correo (#type=invite&invite_token=...) o token
      // conservado en localStorage durante el redirect de OAuth de Google.
      window.location.hash.includes("type=invite") ||
      localStorage.getItem(INVITE_TOKEN_STORAGE_KEY) !== null,
  );
  const [portalView, setPortalView] = useState("admin"); // admin | student
  // PR4: rol de la sesion actual. roleState guarda junto al rol el uid para el
  // que fue consultado: un rol viejo de otra sesion nunca se aplica a la
  // sesion nueva (se trata como pendiente hasta volver a consultar).
  const [roleState, setRoleState] = useState({ uid: null, role: null, status: "idle" });
  const [roleRetry, setRoleRetry] = useState(0);
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, isDark]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // PR4: consulta get_my_role una vez por sesion (uid) y solo fuera del flujo
  // de invitacion. Ningun setState es sincrono dentro del efecto: mientras el
  // rol no sea "ready"/"error" para la sesion actual, el render muestra el
  // loader y jamas concede el panel.
  const sessionUid = session?.user?.id ?? null;
  useEffect(() => {
    if (inviteMode || sessionUid === null) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await Students.getMyRole();
      if (cancelled) return;
      if (error) {
        setRoleState({ uid: sessionUid, role: null, status: "error" });
        return;
      }
      // data null = cuenta sin rol en user_roles -> vista restringida.
      setRoleState({ uid: sessionUid, role: data, status: "ready" });
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionUid, inviteMode, roleRetry]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada.");
  };

  // Fin del flujo de invitación: limpia el token localStorage y el hash para
  // que un reload no vuelva a entrar en modo invitación.
  const handleInviteComplete = () => {
    localStorage.removeItem(INVITE_TOKEN_STORAGE_KEY);
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
    setInviteMode(false);
  };

  const selected =
    tables.find((table) => table.name === selectedTable) ?? tables[0];
  const PageComponent = selected.component;

  if (portalView === "student") {
    return (
      <>
        <StudentPasswordPortal onExit={() => setPortalView("admin")} />
        <ToastContainer theme={isDark ? "dark" : "light"} />
      </>
    );
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
        <Loader className="mx-auto" />
      </div>
    );
  }

  if (inviteMode) {
    return (
      <>
        <InvitePage session={session} onComplete={handleInviteComplete} />
        <ToastContainer theme={isDark ? "dark" : "light"} />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <LoginPage onStudentAccess={() => setPortalView("student")} />
        <ToastContainer theme={isDark ? "dark" : "light"} />
      </>
    );
  }

  // PR4: el panel solo se renderiza con rol "admin" de la sesion actual.
  // Mientras el rol no se conoce (aun no consultado o de otra sesion) se
  // muestra el loader; si la consulta falla se muestra error con reintento.
  // Ningun camino concede el panel sin un rol admin confirmado.
  const roleForSession =
    roleState.uid === sessionUid
      ? roleState
      : { uid: sessionUid, role: null, status: "idle" };

  if (roleForSession.status !== "ready" && roleForSession.status !== "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
        <Loader className="mx-auto" />
      </div>
    );
  }

  if (roleForSession.status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-900">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            No se pudo verificar tu rol
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Ocurrió un error al consultar tus permisos de acceso. Intenta de
            nuevo o cierra la sesión.
          </p>
          <button
            type="button"
            onClick={() => setRoleRetry((n) => n + 1)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
          >
            <i className="fa fa-rotate-right" />
            Reintentar
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 w-full text-center text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
          >
            Cerrar sesión
          </button>
        </div>
        <ToastContainer theme={isDark ? "dark" : "light"} />
      </div>
    );
  }

  // PR5: authenticated students get their own workspace. keyed by uid so a
  // session switch remounts the dashboard. Teachers and unmapped accounts
  // keep RestrictedView.
  if (roleForSession.role !== "admin") {
    if (roleForSession.role === "student") {
      return (
        <StudentDashboard
          key={sessionUid}
          isDark={isDark}
          onLogout={handleLogout}
        />
      );
    }
    return (
      <RestrictedView
        email={session.user.email}
        onStudentAccess={() => setPortalView("student")}
        onLogout={handleLogout}
        isDark={isDark}
      />
    );
  }

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
        <div className="m-1 rounded-md border border-slate-800 p-2">
          <p className="truncate text-xs font-medium uppercase text-slate-600 dark:text-slate-300">
            <i className="fa fa-user me-2 opacity-50" />
            {session.user.email}
          </p>
        </div>
        <div className="border-t border-slate-200 p-3 dark:border-slate-700">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
              }
              title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              className="size-8 shrink-0 rounded-lg border-2 border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <i className={isDark ? "fa fa-sun" : "fa fa-moon"} />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="inline-flex size-8 items-center justify-center rounded-lg bg-red-600 text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:bg-red-700 dark:hover:bg-red-600"
            >
              <i className="fa fa-right-from-bracket" />
            </button>
          </div>
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
