import PropTypes from "prop-types";
import { useState, useEffect } from "react";

const Modal = ({ modalTitle, isOpen, onClose, fields, onSubmit }) => {
  const [formValues, setFormValues] = useState({});

  useEffect(() => {
    if (fields) {
      const initialValues = {};
      fields.forEach((field) => {
        initialValues[field.name] = field.value;
      });
      setFormValues(initialValues);
    }
  }, [fields]);

  useEffect(() => {
    if (!isOpen) {
      clearForm();
    }
  }, [isOpen]);

  function clearForm() {
    setFormValues({});
  }

  const handleSubmit = (ev) => {
    ev.preventDefault();
    onSubmit(formValues);
    clearForm();
  };

  const handleInputChange = (ev) => {
    console.log(formValues);
    const { name, value } = ev.target;
    setFormValues((prevValues) => ({ ...prevValues, [name]: value }));
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
          <div className="flex items-center justify-between rounded-t border-b p-4 md:p-5 dark:border-gray-600">
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
            {fields.map((field, index) => {
              return (
                <div key={index}>
                  <label
                    htmlFor={field.name}
                    className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                  >
                    {field.label}
                    {field.required && "*"}
                  </label>
                  <input
                    type="text"
                    name={field.name}
                    id={field.name}
                    value={formValues[field.name] || ""}
                    onChange={handleInputChange}
                    className="focus:ring-primary-600 focus:border-primary-600 dark:focus:ring-primary-500 dark:focus:border-primary-500 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    required={field.required}
                  />
                </div>
              );
            })}
            <div id="error-message" className="text-red-500"></div>
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
    }),
  ),
  onSubmit: PropTypes.func,
};

export default Modal;
