import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { supabase } from "../supabase/client";
import Loader from "../components/Loader";

const InvitePage = ({ onComplete }) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.warn("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirm) {
      toast.warn("Las contraseñas no coinciden.");
      return;
    }

    setPending(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (!cancelledRef.current && error) {
        toast.error(
          "No se pudo configurar la contraseña. Intenta de nuevo.",
        );
        return;
      }

      if (!cancelledRef.current) {
        toast.success("Cuenta configurada. ¡Bienvenido/a!");
        onComplete();
      }
    } finally {
      if (!cancelledRef.current) {
        setPending(false);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h1 className="text-center text-xl font-bold text-slate-900 dark:text-white">
          Bienvenido/a
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
          Establece tu contraseña para completar el acceso
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label
              htmlFor="invite-password"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Contraseña
            </label>
            <input
              id="invite-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 px-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
            />
          </div>

          <div>
            <label
              htmlFor="invite-confirm"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Confirmar contraseña
            </label>
            <input
              id="invite-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
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
                Configurar contraseña
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InvitePage;