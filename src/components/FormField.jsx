import PropTypes from "prop-types";

const inputClass =
  "focus:ring-primary-600 focus:border-primary-600 dark:focus:ring-primary-500 dark:focus:border-primary-500 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400";

// Los campos con colSpan 1 no necesitan clase (span 1 es el default del grid).
// En sm (2 columnas) un campo "mediano" (colSpan 2) ocupa la fila completa;
// en lg (4 columnas) ocupa la mitad. Los largos (colSpan 4) ocupan la fila
// completa en sm y lg.
const colSpanClasses = {
  2: "sm:col-span-2 lg:col-span-2",
  3: "sm:col-span-2 lg:col-span-3",
  4: "sm:col-span-2 lg:col-span-4",
};

// Fuerza el inicio del campo en la columna 1 (nueva fila en grid).
const colStartClasses = {
  1: "sm:col-start-1 lg:col-start-1",
};

const FormField = ({
  field,
  value,
  onChange,
  optionsList = [],
  disabled = false,
}) => {
  const colSpanClass = colSpanClasses[field.colSpan] ?? "";
  const colStartClass = colStartClasses[field.colStart] ?? "";
  if (field.hidden) return null;
  return (
    <div className={`${colSpanClass} ${colStartClass}`.trim()}>
      <label
        htmlFor={field.name}
        className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
      >
        {field.label}
        {field.required && "*"}
      </label>
      {field.list ? (
        <select
          name={field.name}
          id={field.name}
          value={value || ""}
          onChange={onChange}
          disabled={disabled}
          className={inputClass}
          required={field.required}
        >
          <option value="">Selecciona una opción</option>
          {optionsList
            .find((opc) => opc.name === field.name)
            ?.options.map((opc) => (
              <option key={opc.value} value={opc.value}>
                {opc.text}
              </option>
            ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          name={field.name}
          id={field.name}
          value={value || ""}
          onChange={onChange}
          rows={field.rows || 3}
          disabled={disabled}
          className={inputClass}
          required={field.required}
        />
      ) : field.type === "file" ? (
        <>
          <input
            type="file"
            accept={field.accept || "image/*"}
            name={field.name}
            id={field.name}
            onChange={onChange}
            disabled={disabled}
            className={inputClass}
          />
          {typeof value === "string" && value !== "" && (
            <img
              src={value}
              alt={field.label}
              className="mt-2 max-h-24 rounded border border-gray-300 dark:border-gray-600"
            />
          )}
        </>
      ) : (
        <input
          type={field.type || "text"}
          name={field.name}
          id={field.name}
          value={value || ""}
          onChange={onChange}
          min={field.min}
          disabled={disabled}
          className={inputClass}
          required={field.required}
        />
      )}
    </div>
  );
};

FormField.propTypes = {
  field: PropTypes.shape({
    name: PropTypes.string,
    label: PropTypes.string,
    value: PropTypes.any,
    required: PropTypes.bool,
    list: PropTypes.bool,
    disabled: PropTypes.bool,
    hidden: PropTypes.bool,
    type: PropTypes.string,
    accept: PropTypes.string,
    rows: PropTypes.number,
    min: PropTypes.number,
    colSpan: PropTypes.number,
    colStart: PropTypes.number,
  }).isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  optionsList: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.string,
          text: PropTypes.string,
        }),
      ),
    }),
  ),
  disabled: PropTypes.bool,
};

export default FormField;
