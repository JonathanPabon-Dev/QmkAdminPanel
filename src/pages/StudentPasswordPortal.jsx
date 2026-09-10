import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { supabase } from "../supabase/client";
import Loader from "../components/Loader";

// Portal temporal de estudiantes: solo gestion de contrasena. El portal
// completo vivira en otro proyecto. Nunca toca la sesion admin.
const StudentPasswordPortal = ({ onExit }) => {
  const [screen, setScreen] = useState("login"); // login | change
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [mustChange, setMustChange] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const resetForm = () => {
    setCode("");
    setPassword("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirm("");
    setMustChange(false);
  };

  const handleBack = () => {
    resetForm();
    setScreen("login");
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const numericCode = Number(code.trim());
    if (Number.isNaN(numericCode) || !password) {
      toast.warn("Ingresa tu código y tu contraseña.");
      return;
    }

    setPending(true);

    try {
      const { data, error } = await supabase.rpc("login_student", {
        p_code: numericCode,
        p_password: password,
      });

      if (!cancelledRef.current && (error || !data)) {
        toast.error("Código o contraseña incorrectos.");
        return;
      }

      if (!cancelledRef.current) {
        if (data.must_change_password) {
          setMustChange(true);
          setCurrentPassword(password);
          toast.warn(
            "Debes cambiar tu contraseña antes de continuar. Es obligatorio por seguridad.",
          );
        } else {
          setMustChange(false);
          setCurrentPassword("");
        }
        setScreen("change");
      }
    } finally {
      if (!cancelledRef.current) {
        setPending(false);
      }
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!mustChange && !currentPassword) {
      toast.warn("Ingresa tu contraseña actual.");
      return;
    }
    if (newPassword.length < 6) {
      toast.warn("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword === (mustChange ? password : currentPassword)) {
      toast.warn("La nueva contraseña debe ser diferente a la actual.");
      return;
    }
    if (newPassword !== confirm) {
      toast.warn("Las contraseñas no coinciden.");
      return;
    }

    const numericCode = Number(code.trim());

    setPending(true);

    try {
      const { data, error } = await supabase.rpc("update_student_password", {
        p_code: numericCode,
        p_current_password: mustChange ? password : currentPassword,
        p_new_password: newPassword,
      });

      if (!cancelledRef.current && (error || !data)) {
        toast.error(
          "No se pudo actualizar la contraseña. Verifica tu contraseña actual.",
        );
        return;
      }

      if (!cancelledRef.current) {
        toast.success("Contraseña actualizada. Inicia sesión con tu nueva contraseña.");
        handleBack();
      }
    } finally {
      if (!cancelledRef.current) {
        setPending(false);
      }
    }
  };

  if (screen === "login") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h1 className="text-center text-xl font-bold text-slate-900 dark:text-white">
            Acceso estudiantes
          </h1>
          <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
            Ingresa para gestionar tu contraseña
          </p>

          <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-4">
            <div>
              <label
                htmlFor="student-code"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Código
              </label>
              <input
                id="student-code"
                type="text"
                inputMode="numeric"
                autoComplete="username"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Tu código de estudiante"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 px-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
              />
            </div>

            <div>
              <label
                htmlFor="student-password"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Contraseña
              </label>
              <input
                id="student-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 px-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-slate-800"
            >
              {pending ? (
                <Loader className="mx-auto" />
              ) : (
                <>
                  <i className="fa fa-right-to-bracket" />
                  Ingresar
                </>
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={onExit}
            className="mt-4 w-full text-center text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
          >
            Volver al acceso administradores
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h1 className="text-center text-xl font-bold text-slate-900 dark:text-white">
          {mustChange ? "Cambio de contraseña obligatorio" : "Cambiar contraseña"}
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
          {mustChange
            ? "Por seguridad, define una contraseña personal antes de continuar."
            : "Puedes actualizar tu contraseña cuando quieras."}
        </p>

        <form
          onSubmit={handleChangePassword}
          className="mt-6 flex flex-col gap-4"
        >
          {!mustChange && (
            <div>
              <label
                htmlFor="change-current"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Contraseña actual
              </label>
              <input
                id="change-current"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 px-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="change-new"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Nueva contraseña
            </label>
            <input
              id="change-new"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 px-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
            />
          </div>

          <div>
            <label
              htmlFor="change-confirm"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Confirmar nueva contraseña
            </label>
            <input
              id="change-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la nueva contraseña"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 px-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-slate-800"
          >
            {pending ? (
              <Loader className="mx-auto" />
            ) : (
              <>
                <i className="fa fa-key" />
                Actualizar contraseña
              </>
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={handleBack}
          className="mt-4 w-full text-center text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
        >
          Volver
        </button>
      </div>
    </div>
  );
};

export default StudentPasswordPortal;