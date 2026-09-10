import PropTypes from "prop-types";
import { useState } from "react";
import { toast } from "react-toastify";
import FormField from "./FormField";

const Modal = ({
  modalTitle,
  isOpen,
  onClose,
  fields,
  onSubmit,
  optionsList = [],
  onFieldChange = null,
  onFileChange = null,
  validateForm = null,
}) => {
  const [formValues, setFormValues] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [prevFields, setPrevFields] = useState(fields);
  const [prevOpen, setPrevOpen] = useState(isOpen);

  if (fields !== prevFields) {
    setPrevFields(fields);
    if (fields) {
      const initialValues = {};
      fields.forEach((field) => {
        initialValues[field.name] = field.value;
      });
      setFormValues(initialValues);
    }
  }

  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (!isOpen) {
      setFormValues({});
      setErrorMessage("");
    }
  }

  function clearForm() {
    setFormValues({});
  }

  const handleSubmit = (ev) => {
    ev.preventDefault();

    // Validación opcional por página (p. ej. "texto O imagen" en opciones de
    // preguntas): bloquea el envío y muestra el mensaje sin limpiar el form.
    if (validateForm) {
      const error = validateForm(formValues);
      if (error) {
        setErrorMessage(error);
        return;
      }
    }

    setErrorMessage("");
    onSubmit(formValues);
    clearForm();
  };

  const handleInputChange = async (ev) => {
    if (errorMessage) setErrorMessage("");
    const { name, value } = ev.target;
    // File input: it is uncontrolled (no usable "value"); the file is uploaded
    // through onFileChange, which resolves to the public URL on success.
    if (ev.target.files && ev.target.files[0]) {
      if (!onFileChange) return;
      try {
        // El valor anterior se reenvía para que la página pueda borrar el
        // archivo reemplazado del bucket (edit) o el upload previo (insert).
        const url = await onFileChange(
          name,
          ev.target.files[0],
          formValues[name]
        );
        if (typeof url === "string" && url !== "") {
          setFormValues((prevValues) => ({ ...prevValues, [name]: url }));
        }
      } catch {
        toast.error("Error al subir la imagen");
      }
      return;
    }
    setFormValues((prevValues) => {
      // onFieldChange puede derivar/ajustar valores de otros campos y devolver
      // el objeto completo; null significa cambio normal de un solo campo.
      const adjusted = onFieldChange
        ? onFieldChange(name, value, { ...prevValues })
        : null;
      return adjusted ?? { ...prevValues, [name]: value };
    });
  };

  if (!isOpen) return null;
  return (
    <div
      tabIndex="-1"
      aria-hidden={!isOpen}
      className={`fixed left-0 right-0 top-0 z-50 flex h-[calc(100%-1rem)] max-h-full w-full items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-800 bg-opacity-50 md:inset-0 ${
        isOpen ? "" : "hidden"
      }`}
    >
      <div className="relative max-h-full w-full max-w-2xl p-4">
        <div className="relative rounded-lg bg-white shadow dark:bg-gray-700">
          <div className="flex items-center justify-between rounded-t border-b p-4 dark:border-gray-600 md:p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {modalTitle}
            </h3>
            <button
              type="button"
              className="ml-auto inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm font-bold text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
              onClick={onClose}
            >
              <i className="fa fa-close" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {fields.map((field) => (
                <FormField
                  key={field.name}
                  field={field}
                  value={formValues[field.name]}
                  onChange={handleInputChange}
                  optionsList={optionsList}
                  disabled={field.disabled}
                />
              ))}
            </div>
            <div id="error-message" className="min-h-5 text-sm text-red-500">
              {errorMessage}
            </div>
            <button
              type="submit"
              className="ml-auto inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm font-bold text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

Modal.propTypes = {
  modalTitle: PropTypes.string,
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  fields: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      label: PropTypes.string,
      value: PropTypes.any,
      required: PropTypes.bool,
      list: PropTypes.bool,
      disabled: PropTypes.bool,
      type: PropTypes.string,
      min: PropTypes.number,
      colSpan: PropTypes.number,
    }),
  ),
  onSubmit: PropTypes.func,
  optionsList: PropTypes.arrayOf(
    PropTypes.shape({
      field: PropTypes.string,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.string,
          text: PropTypes.string,
        }),
      ),
    }),
  ),
  onFieldChange: PropTypes.func,
  onFileChange: PropTypes.func,
  validateForm: PropTypes.func,
};

export default Modal;
