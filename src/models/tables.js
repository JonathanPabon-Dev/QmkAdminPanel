import ItemsPage from "../pages/ItemsPage";
import ParametersPage from "../pages/ParametersPage";
import SubjectsPage from "../pages/SubjectsPage";
import StudentsPage from "../pages/StudentsPage";
import QuizzesPage from "../pages/QuizzesPage";
import QuestionsPage from "../pages/QuestionsPage";

export const tables = [
  { name: "Ítems Emparejados", component: ItemsPage },
  { name: "Parámetros", component: ParametersPage },
  { name: "Asignaturas", component: SubjectsPage },
  { name: "Estudiantes", component: StudentsPage },
  { name: "Cuestionarios", component: QuizzesPage },
  { name: "Banco de Preguntas", component: QuestionsPage },
];
