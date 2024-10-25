import ItemsPage from "./pages/ItemsPage";
import { ToastContainer } from "react-toastify";

const App = () => {
  return (
    <>
      <ItemsPage />
      <ToastContainer theme="dark" />
    </>
  );
};

export default App;
