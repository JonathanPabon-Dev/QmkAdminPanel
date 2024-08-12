import PropTypes from "prop-types";
import { validateForm } from "../utils/validateForm";

const Modal = ({ modalTitle, isOpen, onClose, fields, onSubmit }) => {
  if (!isOpen) return null;

  const handleSubmit = (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const fields = form.elements;
    let isValid = true;

    isValid = validateForm(fields);

    // Si el formulario es válido, enviarlo
    if (!isValid) {
      document.getElementById("error-message").textContent =
        "*Campos requeridos o valores incorrectos.";
    } else {
      onSubmit(form);
    }
  };

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
          <div className="flex items-center justify-between rounded-t border-b p-4 md:p-5 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {modalTitle}
            </h3>
            <button
              type="button"
              className="ml-auto inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
              onClick={onClose}
            >
              <i className="fa fa-close" />
              <span className="sr-only">Close modal</span>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
            {fields.map((field, index) => {
              switch (field.type) {
                case "text":
                  return (
                    <div key={index}>
                      <label
                        htmlFor={field.name}
                        className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                      >
                        {field.label}
                      </label>
                      <input
                        type="text"
                        name={field.name}
                        id={field.name}
                        value={field.value}
                        onChange={(ev) => {
                          console.log("Text changed.", ev.target.value);
                        }}
                        className="focus:ring-primary-600 focus:border-primary-600 dark:focus:ring-primary-500 dark:focus:border-primary-500 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    </div>
                  );
                case "textarea":
                  return (
                    <div key={index}>
                      <label
                        htmlFor={field.name}
                        className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                      >
                        {field.label}
                      </label>
                      <textarea
                        id={field.name}
                        value={field.value}
                        onChange={(ev) => {
                          console.log("Text changed.", ev.target.value);
                        }}
                        className="focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-500 dark:focus:border-primary-500 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    </div>
                  );
                case "number":
                  return (
                    <div key={index}>
                      <label
                        htmlFor={field.name}
                        className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                      >
                        {field.label}
                      </label>
                      <input
                        type="number"
                        name={field.name}
                        id={field.name}
                        value={field.value}
                        onChange={(ev) => {
                          console.log("Number changed.", ev.target.value);
                        }}
                        className="focus:ring-primary-600 focus:border-primary-600 dark:focus:ring-primary-500 dark:focus:border-primary-500 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                        placeholder={field.placeholder}
                        required={field.required}
                        step={field.step}
                      />
                    </div>
                  );
                case "dropdown":
                  return (
                    <div key={index}>
                      <label
                        htmlFor={field.name}
                        className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                      >
                        {field.label}
                      </label>
                      <select
                        id={field.name}
                        value={field.value}
                        onChange={(ev) => {
                          console.log("Option changed.", ev.target.value);
                        }}
                        className="focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-500 dark:focus:border-primary-500 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                      >
                        {field.options.map((option, index) => (
                          <option key={index} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                default:
                  return null;
              }
            })}
            <div id="error-message" className="text-red-500"></div>
            <button
              type="submit"
              className="bg-primary-700 hover:bg-primary-800 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 inline-flex items-center rounded-lg px-5 py-2.5 text-center text-sm font-medium text-white focus:outline-none focus:ring-4"
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
      type: PropTypes.string,
      value: PropTypes.any,
      placeholder: PropTypes.string,
      required: PropTypes.bool,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.any,
          label: PropTypes.string,
        }),
      ),
    }),
  ),
  onSubmit: PropTypes.func,
};

export default Modal;
