import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { supabase } from "../supabase/client";
import Loader from "../components/Loader";

const LoginPage = ({ onStudentAccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast.warn("Ingresa correo y contraseña.");
      return;
    }

    setPending(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (!cancelledRef.current && error) {
        toast.error(
          "Credenciales incorrectas. Verifica e intenta de nuevo.",
        );
      }
    } finally {
      if (!cancelledRef.current) {
        setPending(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setPending(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + import.meta.env.BASE_URL,
        },
      });

      if (!cancelledRef.current && error) {
        toast.error("No se pudo iniciar sesión con Google. Intenta de nuevo.");
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
          Panel de Administración
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
          Inicia sesión para continuar
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label
              htmlFor="login-email"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Correo electrónico
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <i className="fa fa-envelope" />
              </span>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Contraseña
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <i className="fa fa-lock" />
              </span>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
              />
            </div>
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
                Iniciar sesión
              </>
            )}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs uppercase tracking-wide text-slate-400">
            o
          </span>
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:ring-offset-slate-800"
        >
          <i className="fa-brands fa-google text-base" />
          Continuar con Google
        </button>

        <button
          type="button"
          onClick={onStudentAccess}
          className="mt-4 w-full text-center text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
        >
          ¿Eres estudiante? Gestiona tu contraseña
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
