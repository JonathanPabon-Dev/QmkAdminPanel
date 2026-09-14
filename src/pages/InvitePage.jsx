import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { supabase } from "../supabase/client";
import Loader from "../components/Loader";

// Clave de localStorage que conserva el token de invitación a través del
// redirect de OAuth de Google. El redirectTo es una URL limpia (mismo patrón
// que LoginPage) porque un redirectTo con hash rompería el fragment del flujo
// implícito de GoTrue; App.jsx la lee para volver a entrar en modo invitación.
export const INVITE_TOKEN_STORAGE_KEY = "qmk-invite-token";

const INVITE_REASON_MESSAGES = {
  INVITE_NOT_FOUND: "El enlace de confirmación no es válido o ya no existe.",
  ALREADY_USED: "Este enlace de confirmación ya fue utilizado.",
  INVITE_EXPIRED:
    "El enlace de confirmación caducó. Los enlaces tienen una vigencia de 7 días.",
  NOT_LINKED:
    "Este enlace está vinculado a otra cuenta de Google. Cierra la sesión actual y vuelve a abrir el enlace con la cuenta de Gmail que recibió la confirmación.",
  INTERNAL: "Ocurrió un error al vincular la cuenta. Intenta de nuevo.",
};

// El enlace llega en el correo como:
//   {origin}/QmkAdminPanel/#type=invite&invite_token=<uuid>
// Tras el redirect de OAuth el hash queda limpio y el token se recupera de
// localStorage (guardado justo antes de iniciar sesión con Google).
const readInviteToken = () => {
  const match = window.location.hash.match(
    /[?&]invite_token=([0-9a-fA-F-]{36})/,
  );
  if (match) return match[1];
  return localStorage.getItem(INVITE_TOKEN_STORAGE_KEY);
};

// Página de invitación de estudiante. Si el enlace trae invite_token se
// vincula la cuenta con Google (nuevo flujo); sin token se conserva el flujo
// anterior de configuración de contraseña.
const InvitePage = ({ session, onComplete }) => {
  const [token] = useState(readInviteToken);
  const isLegacy = !token;

  // Flujo anterior (sin invite_token): configurar contraseña.
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);

  // Flujo con Google.
  const [status, setStatus] = useState("checking"); // checking | success | error
  const [reason, setReason] = useState(null);
  const [studentName, setStudentName] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const acceptStartedRef = useRef(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  // La aceptación espera a que la sesión esté lista (App.jsx monta esta
  // página después del getSession y propaga los cambios de sesión vía
  // onAuthStateChange): accept_student_invite necesita auth.uid() para
  // emparejar con el auth_user_id de la invitación. Los setState solo ocurren
  // tras el await de la RPC; mientras tanto la vista "google" o "vinculando"
  // se deriva de session + status en el render.
  useEffect(() => {
    if (isLegacy || acceptStartedRef.current || !session) return;
    acceptStartedRef.current = true;

    const runAccept = async () => {
      const { data, error } = await supabase.rpc("accept_student_invite", {
        p_token: token,
      });
      if (cancelledRef.current) return;
      if (error || !data) {
        setReason("INTERNAL");
        setStatus("error");
        return;
      }
      if (data.ok) {
        setStudentName(data.student?.name ?? "");
        setStatus("success");
        return;
      }
      setReason(data.reason);
      setStatus("error");
    };
    runAccept();
  }, [token, session, attempt, isLegacy]);

  const handleLegacySubmit = async (e) => {
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

  const handleGoogleLogin = async () => {
    // El token sobrevive al redirect de OAuth en localStorage; App.jsx lo usa
    // para re-entrar en modo invitación al volver.
    localStorage.setItem(INVITE_TOKEN_STORAGE_KEY, token);
    setBusy(true);
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
        setBusy(false);
      }
    }
  };

  // "Solicitar nuevo enlace": se cierra la sesión (puede ser una cuenta de
  // Google distinta a la invitada) para que LoginPage muestre el acceso al
  // portal del estudiante; onComplete limpia el token de invitación.
  const handleRequestNewInvite = async () => {
    setBusy(true);
    try {
      await supabase.auth.signOut();
      if (!cancelledRef.current) {
        onComplete();
      }
    } finally {
      if (!cancelledRef.current) {
        setBusy(false);
      }
    }
  };

  const handleRetry = () => {
    acceptStartedRef.current = false;
    setStatus("checking");
    setAttempt((prev) => prev + 1);
  };

  const handleEnterPanel = () => {
    onComplete();
  };

  if (isLegacy) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h1 className="text-center text-xl font-bold text-slate-900 dark:text-white">
            Bienvenido/a
          </h1>
          <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
            Establece tu contraseña para completar el acceso
          </p>

          <form
            onSubmit={handleLegacySubmit}
            autoComplete="off"
            className="mt-6 flex flex-col gap-4"
          >
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
                autoComplete="off"
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
                autoComplete="off"
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
  }

  const wrapper = (content) => (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {content}
      </div>
    </div>
  );

  const titleClass =
    "text-center text-xl font-bold text-slate-900 dark:text-white";
  const hintClass =
    "mt-1 text-center text-sm text-slate-500 dark:text-slate-400";
  const primaryClass =
    "mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-slate-800";
  const googleClass =
    "mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:ring-offset-slate-800";
  const linkClass =
    "mt-4 w-full text-center text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400";

  // El orden importa: success/error primero para que el cierre de sesión en
  // "Solicitar nuevo enlace" no vuelque brevemente la vista a "Continuar con
  // Google". La vista "google" solo aparece sin sesión y sin resultado.
  if (status === "success") {
    return wrapper(
      <>
        <h1 className={titleClass}>¡Cuenta vinculada!</h1>
        <p className={hintClass}>
          {studentName
            ? `${studentName}, tu cuenta quedó vinculada con Google. `
            : "Tu cuenta quedó vinculada con Google. "}
          Ya puedes ingresar al panel con tu correo de Gmail.
        </p>
        <button
          type="button"
          onClick={handleEnterPanel}
          className={primaryClass}
        >
          <i className="fa fa-right-to-bracket" />
          Entrar al panel
        </button>
      </>,
    );
  }

  if (status === "error") {
    const showNewInvite = reason !== "ALREADY_USED";
    return wrapper(
      <>
        <h1 className={titleClass}>No se pudo vincular la cuenta</h1>
        <p className={hintClass}>
          {INVITE_REASON_MESSAGES[reason] ?? INVITE_REASON_MESSAGES.INTERNAL}
        </p>
        {reason === "ALREADY_USED" && (
          <button
            type="button"
            onClick={handleEnterPanel}
            className={primaryClass}
          >
            <i className="fa fa-right-to-bracket" />
            Entrar al panel
          </button>
        )}
        {reason === "INTERNAL" && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={busy}
            className={primaryClass}
          >
            {busy ? (
              <Loader className="mx-auto" />
            ) : (
              <>
                <i className="fa fa-rotate-right" />
                Reintentar
              </>
            )}
          </button>
        )}
        {showNewInvite && (
          <button
            type="button"
            onClick={handleRequestNewInvite}
            disabled={busy}
            className={primaryClass}
          >
            {busy ? (
              <Loader className="mx-auto" />
            ) : (
              <>
                <i className="fa fa-envelope" />
                Solicitar nuevo enlace
              </>
            )}
          </button>
        )}
        {showNewInvite && (
          <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
            Puedes solicitar un nuevo enlace desde el portal del estudiante.
          </p>
        )}
      </>,
    );
  }

  // Sin sesión y sin resultado todavía: botón "Continuar con Google".
  if (!session) {
    return wrapper(
      <>
        <h1 className={titleClass}>Vincular cuenta con Google</h1>
        <p className={hintClass}>
          Tu correo quedó confirmado. Continúa con Google usando la cuenta de
          Gmail a la que llegó la confirmación.
        </p>
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={busy}
          className={googleClass}
        >
          {busy ? (
            <Loader className="mx-auto" />
          ) : (
            <>
              <i className="fa-brands fa-google text-base" />
              Continuar con Google
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleEnterPanel}
          disabled={busy}
          className={linkClass}
        >
          Cancelar
        </button>
      </>,
    );
  }

  // checking (aceptación en curso — la sesión ya está lista)
  return wrapper(
    <>
      <Loader className="mx-auto" />
      <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
        Vinculando tu cuenta...
      </p>
    </>,
  );
};

export default InvitePage;