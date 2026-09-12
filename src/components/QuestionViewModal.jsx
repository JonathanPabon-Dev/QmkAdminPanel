import { useEffect } from "react";
import PropTypes from "prop-types";

// Modal informativo de solo lectura para una pregunta: NO renderiza inputs,
// presenta el texto y las imágenes (pregunta + 4 opciones), sin revelar cuál
// es la opción correcta.
const QuestionViewModal = ({ question, isOpen, onClose }) => {
  // Mientras la modal está abierta bloquea el scroll del contenido de atrás.
  useEffect(() => {
    if (!isOpen || !question) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, question]);

  // Cierra con la tecla Escape.
  useEffect(() => {
    if (!isOpen || !question) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, question, onClose]);

  if (!isOpen || !question) return null;

  const options = [1, 2, 3, 4].map((n) => ({
    number: n,
    text: question[`option_${n}_text`],
    image: question[`option_${n}_image_url`],
  }));

  return (
    <div
      tabIndex="-1"
      onClick={onClose}
      className="fixed left-0 right-0 top-0 z-50 flex h-full max-h-full w-full items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900 bg-opacity-85 backdrop-blur-sm p-4 md:inset-0"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="max-h-full w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-gray-800"
      >
        <div className="flex items-center justify-between rounded-t border-b p-4 dark:border-gray-600 md:p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            {question.id}
          </h3>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="ml-auto inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm font-bold text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
          >
            <i className="fa fa-close" />
          </button>
        </div>

        <div className="flex flex-col gap-5 p-4 md:p-5">
          {/* Pregunta */}
          <div className="flex flex-col gap-2">
            {question.question_text && (
              <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                {question.question_text}
              </p>
            )}
            {question.question_image_url && (
              <img
                src={question.question_image_url}
                alt="Pregunta"
                className="max-h-64 w-fit rounded-lg border border-gray-200 object-contain dark:border-gray-600"
              />
            )}
          </div>

          {/* Opciones */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {options.map((option) => (
              <div
                key={option.number}
                className="flex flex-col gap-2 rounded-lg border-2 border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700/40"
              >
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Opción {option.number}
                </span>
                {option.text && (
                  <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                    {option.text}
                  </p>
                )}
                {option.image && (
                  <img
                    src={option.image}
                    alt={`Opción ${option.number}`}
                    className="max-h-40 w-fit max-w-full rounded border border-gray-200 object-contain dark:border-gray-600"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

QuestionViewModal.propTypes = {
  question: PropTypes.object,
  isOpen: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};

export default QuestionViewModal;