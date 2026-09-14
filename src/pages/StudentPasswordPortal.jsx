import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { supabase } from "../supabase/client";
import Students from "../supabase/tables/students";
import Loader from "../components/Loader";

// Portal temporal de estudiantes: registro del correo de Gmail, reenvio de
// la confirmacion y acceso final con Google (codigo + contrasena solo hasta
// que el correo queda vinculado). Nunca toca la sesion admin.

const maskEmail = (email) => {
  if (!email) return "";
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
};

const registerEmailError = (reason) => {
  const messages = {
    STUDENT_NOT_FOUND: "Estudiante no encontrado.",
    INVALID_PASSWORD: "La contraseña actual no es correcta.",
    ALREADY_LINKED: "Esta cuenta ya está vinculada con Google.",
    GMAIL_ONLY: "Solo se admiten correos de Gmail.",
    EMAIL_TAKEN: "Ese correo ya está registrado para otro estudiante.",
    EMAIL_IN_USE: "Ese correo ya tiene un usuario en el sistema.",
  };
  return (
    messages[reason] ?? "No se pudo registrar el correo. Intenta de nuevo."
  );
};

const sendInviteError = (code) => {
  const messages = {
    INVALID_PROOF: "La confirmación no es válida. Intenta de nuevo.",
    PROOF_USED: "La confirmación ya fue enviada. Revisa tu correo.",
    INVITE_EXPIRED: "La confirmación caducó. Intenta de nuevo.",
    GMAIL_ONLY: "Solo se admiten correos de Gmail.",
    EMAIL_SEND_FAILED: "No se pudo enviar el correo. Intenta de nuevo.",
  };
  return (
    messages[code] ??
    "Ocurrió un error al enviar la confirmación. Intenta de nuevo."
  );
};

const StudentPasswordPortal = ({ onExit }) => {
  const [screen, setScreen] = useState("login"); // login | gmail | sent | googleonly
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [email, setEmail] = useState(null);
  const [linked, setLinked] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
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
    setEmail(null);
    setLinked(false);
    setEmailInput("");
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
        // La contraseña digitada queda guardada: es la "actual" mientras el
        // flujo no la cambie, y register_student_email la usa como prueba.
        setCurrentPassword(password);
        if (data.google_only) {
          setScreen("googleonly");
        } else if (data.email) {
          // Invitación ya enviada (o cuenta ya vinculada): ir directo a
          // "Revisa tu correo" sin forzar otro cambio de contraseña.
          setEmail(data.email);
          setLinked(data.auth_linked === true);
          setScreen("sent");
        } else {
          setScreen("gmail");
        }
      }
    } finally {
      if (!cancelledRef.current) {
        setPending(false);
      }
    }
  };

  // Registra el correo (prueba la contraseña actual), obtiene el proof de un
  // solo uso e invoca la edge function que envía el correo de invitación. Si
  // la edge function rechaza el proof (p. ej. PROOF_USED), se re-registra una
  // vez: la RPC revoca la invitación pendiente anterior y entrega un proof
  // nuevo. Devuelve true cuando el correo quedó enviado.
  const registerAndSend = async (emailValue, retried = false) => {
    const numericCode = Number(code.trim());
    const { data, error } = await Students.registerStudentEmail({
      code: numericCode,
      currentPassword,
      email: emailValue,
    });

    if (!cancelledRef.current && (error || !data?.ok)) {
      toast.error(registerEmailError(data?.reason));
      return false;
    }

    const result = await Students.sendStudentInvite({ proof: data.proof });

    if (!cancelledRef.current && result.ok) {
      setEmail(data.email);
      return true;
    }

    if (!cancelledRef.current && !result.ok && !retried) {
      return registerAndSend(emailValue, true);
    }

    if (!cancelledRef.current) {
      toast.error(sendInviteError(result.code));
    }
    return false;
  };

  const handleRegisterEmail = async (e) => {
    e.preventDefault();

    const normalized = emailInput.trim().toLowerCase();
    if (!normalized.endsWith("@gmail.com")) {
      toast.warn(
        "Ingresa un correo de Gmail válido (debe terminar en @gmail.com).",
      );
      return;
    }

    setPending(true);
    try {
      const sent = await registerAndSend(normalized);
      if (!cancelledRef.current && sent) {
        setScreen("sent");
      }
    } finally {
      if (!cancelledRef.current) {
        setPending(false);
      }
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setPending(true);
    try {
      const sent = await registerAndSend(email);
      if (!cancelledRef.current && sent) {
        toast.success("Confirmación enviada de nuevo.");
      }
    } finally {
      if (!cancelledRef.current) {
        setPending(false);
      }
    }
  };

  const handleGoogleOnlyLogin = async () => {
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

  if (screen === "login") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h1 className="text-center text-xl font-bold text-slate-900 dark:text-white">
            Acceso estudiantes
          </h1>
          <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
            Ingresa para gestionar tu acceso
          </p>

          <form
            onSubmit={handleLogin}
            autoComplete="off"
            className="mt-6 flex flex-col gap-4"
          >
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
                autoComplete="off"
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
                autoComplete="off"
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

  if (screen === "gmail") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h1 className="text-center text-xl font-bold text-slate-900 dark:text-white">
            Registra tu correo de Gmail
          </h1>
          <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
            Para ingresar al panel con Google, registra el correo de Gmail al
            que enviaremos la confirmación.
          </p>

          <form
            onSubmit={handleRegisterEmail}
            autoComplete="off"
            className="mt-6 flex flex-col gap-4"
          >
            <div>
              <label
                htmlFor="student-gmail"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Correo de Gmail
              </label>
              <input
                id="student-gmail"
                type="email"
                autoComplete="off"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="nombre@gmail.com"
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
                  <i className="fa fa-envelope" />
                  Enviar confirmación
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
  }

  if (screen === "sent") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h1 className="text-center text-xl font-bold text-slate-900 dark:text-white">
            {linked ? "Cuenta vinculada" : "Revisa tu correo"}
          </h1>

          {linked ? (
            <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
              Tu cuenta quedó vinculada con Google. Ya puedes ingresar al
              panel con tu correo de Gmail.
            </p>
          ) : (
            <>
              <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
                Enviamos una confirmación a{" "}
                <strong className="text-slate-700 dark:text-slate-200">
                  {maskEmail(email)}
                </strong>
                . Ábrela desde esa cuenta de Gmail, haz clic en el enlace y
                elige «Continuar con Google» para vincular tu cuenta.
              </p>
              <p className="mt-3 text-center text-xs text-slate-400 dark:text-slate-500">
                El enlace es de un solo uso y caduca a los 7 días.
              </p>
              <button
                type="button"
                onClick={handleResend}
                disabled={pending}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-slate-800"
              >
                {pending ? (
                  <Loader className="mx-auto" />
                ) : (
                  <>
                    <i className="fa fa-paper-plane" />
                    Reenviar confirmación
                  </>
                )}
              </button>
            </>
          )}

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

  // screen === "googleonly"
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h1 className="text-center text-xl font-bold text-slate-900 dark:text-white">
          Acceso con Google
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
          Tu cuenta ya está vinculada con Google. La contraseña de tu código
          quedó deshabilitada; ahora el acceso es solo con la cuenta de Gmail
          vinculada.
        </p>

        <button
          type="button"
          onClick={handleGoogleOnlyLogin}
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:ring-offset-slate-800"
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
          onClick={onExit}
          className="mt-4 w-full text-center text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
        >
          Volver al acceso administradores
        </button>
      </div>
    </div>
  );
};

export default StudentPasswordPortal;
