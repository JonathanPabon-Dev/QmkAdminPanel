import PropTypes from "prop-types";

const Table = ({ headers, dataList, onHandleEdit, onHandleDelete }) => {
  return (
    <div className="relative mx-auto w-fit overflow-x-auto rounded-xl shadow-md">
      <table className="table-auto text-left text-sm text-gray-500 dark:text-gray-400">
        <thead className="bg-gray-50 text-center text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            {Object.keys(headers).map((key, index) => (
              <th key={index} scope="col" className="px-6 py-3">
                {headers[key]}
              </th>
            ))}
            <th scope="col" className="px-6 py-3">
              <span>Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {dataList.map((data, index) => (
            <tr
              key={index}
              className="border-b bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-900"
            >
              {Object.keys(headers).map((key) => (
                <td key={key} className="px-6 py-4 text-white">
                  {data[key]}
                </td>
              ))}
              <td className="flex gap-3 px-6 py-4">
                <button
                  type="button"
                  className="size-8 rounded-lg border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white"
                  onClick={() => onHandleEdit(data._id)}
                >
                  <i className="fa fa-edit" />
                </button>
                <button
                  type="button"
                  className="size-8 rounded-lg border-2 border-red-400 text-red-400 hover:bg-red-400 hover:text-white"
                  onClick={() => onHandleDelete(data._id)}
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
};

export default Table;
