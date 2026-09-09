import PropTypes from "prop-types";

const Table = ({
  headers,
  dataList,
  onHandleEdit,
  onHandleDelete,
  onHandleView,
  renderers = {},
}) => {
  return (
    <div className="relative mx-auto w-fit overflow-x-auto rounded-xl shadow-md">
      <table className="table-auto text-left text-sm text-gray-500 dark:text-gray-400">
        <thead className="bg-gray-50 text-center text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            {Object.keys(headers).map((key) => (
              <th key={key} scope="col" className="px-6 py-3">
                {headers[key]}
              </th>
            ))}
            <th scope="col" className="px-6 py-3">
              <span>Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {dataList.map((data) => (
            <tr
              key={data.id ?? data.code}
              className="border-b bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-900"
            >
              {Object.keys(headers).map((key) => (
                <td key={key} className="px-6 py-4 text-slate-700 dark:text-slate-200">
                  {renderers[key]
                    ? renderers[key](data[key], data)
                    : data[key]}
                </td>
              ))}
              {/* Las filas de tablas reales traen su PK en "id"; la vista
                  v_students expone su PK como "code" (sin columna id).
                  Se prefiere "id" cuando existe. */}
              <td className="flex gap-3 px-6 py-4">
                {onHandleView && (
                  <button
                    type="button"
                    className="size-8 rounded-lg border-2 border-teal-400 text-teal-400 hover:bg-teal-400 hover:text-white"
                    onClick={() => onHandleView(data.id ?? data.code)}
                    title="Ver detalle"
                  >
                    <i className="fa fa-eye" />
                  </button>
                )}
                <button
                  type="button"
                  className="size-8 rounded-lg border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white"
                  onClick={() => onHandleEdit(data.id ?? data.code)}
                >
                  <i className="fa fa-edit" />
                </button>
                <button
                  type="button"
                  className="size-8 rounded-lg border-2 border-red-400 text-red-400 hover:bg-red-400 hover:text-white"
                  onClick={() => onHandleDelete(data.id ?? data.code)}
                >
                  <i className="fa fa-trash" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

Table.propTypes = {
  headers: PropTypes.object,
  dataList: PropTypes.arrayOf(PropTypes.object),
  onHandleEdit: PropTypes.func,
  onHandleDelete: PropTypes.func,
  onHandleView: PropTypes.func,
  renderers: PropTypes.object,
};

export default Table;
