import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import PropTypes from "prop-types";
import { supabase } from "../supabase/client";
import Students from "../supabase/tables/students";
import Loader from "../components/Loader";
import { STUDENT_MODULES } from "../models/modules";

// Icon per module key, with a generic fallback for future modules.
const MODULE_ICONS = {
  quizzes: "fa-clipboard-question",
  notes: "fa-file-lines",
};

// Full name assembled from the four name parts; null parts are skipped
// (same semantics as the v_students view concatenation).
const buildFullName = (student) =>
  [
    student.first_name,
    student.second_name,
    student.first_lastname,
    student.second_lastname,
  ]
    .filter(Boolean)
    .join(" ");

const StudentDashboard = ({ isDark, onLogout }) => {
  const [student, setStudent] = useState(null);
  const [email, setEmail] = useState(null);
  // loading | error | unlinked | ready
  const [status, setStatus] = useState("loading");
  const [retryCount, setRetryCount] = useState(0);

  // PR5: resolve the current user (email) and the student linked to the
  // session in one pass. A null RPC result means the account has no linked
  // student; the unlinked state is rendered instead of the workspace.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("loading");
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (cancelled) return;
      if (userError) {
        setStatus("error");
        return;
      }
      setEmail(userData.user.email);

      const { data, error } = await Students.getStudentByAuthUid();
      if (cancelled) return;
      if (error) {
        setStatus("error");
        return;
      }
      if (!data) {
        setStatus("unlinked");
        return;
      }
      setStudent(data);
      setStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
        <Loader className="mx-auto" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-900">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            No se pudo cargar tu información
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Ocurrió un error al consultar tus datos de estudiante. Intenta de
            nuevo o cierra la sesión.
          </p>
          <button
            type="button"
            onClick={() => setRetryCount((n) => n + 1)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
          >
            <i className="fa fa-rotate-right" />
            Reintentar
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
  }

  if (status === "unlinked") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-900">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <i className="fa fa-user-slash text-4xl text-slate-400" />
          <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
            Cuenta sin estudiante vinculado
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Tu cuenta no está asociada a ningún estudiante. Pide al
            administrador que vincule tu código de estudiante para acceder a
            tus módulos.
          </p>
          <p className="mt-3 truncate text-xs text-slate-400 dark:text-slate-500">
            {email}
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
          >
            <i className="fa fa-right-from-bracket" />
            Cerrar sesión
          </button>
        </div>
        <ToastContainer theme={isDark ? "dark" : "light"} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 dark:bg-slate-900">
      <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <i className="fa fa-graduation-cap shrink-0 text-2xl text-blue-600 dark:text-blue-400" />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-slate-900 dark:text-white">
                Hola, {buildFullName(student)}
              </h1>
              {student.course_id && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Curso {student.course_id}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <p className="hidden max-w-48 truncate text-xs text-slate-500 dark:text-slate-400 md:block">
              {email}
            </p>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:bg-red-700 dark:hover:bg-red-600"
            >
              <i className="fa fa-right-from-bracket" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Tus módulos
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {STUDENT_MODULES.map((module) => {
            const icon = MODULE_ICONS[module.key] ?? "fa-book-open";
            return (
              <article
                key={module.key}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <i
                    className={`fa ${icon} text-2xl text-blue-600 dark:text-blue-400`}
                  />
                  {!module.available && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                      Próximamente
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                  {module.title}
                </h3>
                <p className="mt-1 flex-1 text-sm text-slate-500 dark:text-slate-400">
                  {module.description}
                </p>
                {module.available ? (
                  <a
                    href={module.url}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                  >
                    <i className="fa fa-arrow-up-right-from-square" />
                    Abrir
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="mt-5 inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400 dark:bg-slate-700 dark:text-slate-500"
                  >
                    <i className="fa fa-lock" />
                    Abrir
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </main>

      <ToastContainer theme={isDark ? "dark" : "light"} />
    </div>
  );
};

StudentDashboard.propTypes = {
  isDark: PropTypes.bool.isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default StudentDashboard;