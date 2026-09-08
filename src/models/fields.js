export const itemsFields = [
  {
    name: "value1",
    label: "Valor 1",
    value: "",
    required: true,
    colSpan: 1,
  },
  {
    name: "value2",
    label: "Valor 2",
    value: "",
    required: true,
    colSpan: 1,
  },
  {
    name: "topic",
    label: "Tema",
    value: "",
    required: true,
    colSpan: 2,
  },
];

export const parametersFields = [
  {
    name: "name",
    label: "Parámetro",
    value: "",
    required: true,
    colSpan: 2,
  },
  {
    name: "value",
    label: "Valor",
    value: "",
    required: true,
    colSpan: 1,
  },
];

// Layout del formulario de Cuestionarios (spec del usuario):
// Fila 1 = ID(1) · Tema(3); Fila 2 = Grado(1) · Asignatura(1) · Nº Preguntas(1);
// Fila 3 = Fecha Desde(1) · Fecha Hasta(1).
export const quizzesFields = [
  {
    name: "id",
    label: "ID",
    value: "",
    required: true,
    colSpan: 1,
  },
  {
    name: "topic",
    label: "Tema",
    value: "",
    required: true,
    colSpan: 3,
  },
  {
    name: "grade_level",
    label: "Grado",
    value: "",
    required: true,
    colSpan: 1,
  },
  {
    name: "subject_id",
    label: "Asignatura",
    value: "",
    required: false,
    list: true,
    colSpan: 1,
  },
  {
    name: "question_count",
    label: "Nº Preguntas a Evaluar",
    value: "",
    required: false,
    type: "number",
    min: 1,
    colSpan: 1,
  },
  {
    name: "available_since",
    label: "Fecha Desde",
    value: "",
    required: false,
    type: "date",
    colSpan: 1,
    colStart: 1,
  },
  {
    name: "available_until",
    label: "Fecha Hasta",
    value: "",
    required: false,
    type: "date",
    colSpan: 1,
  },
];

export const questionsFields = [
  {
    name: "id",
    label: "ID",
    value: "",
    list: false,
    required: true,
    colSpan: 1,
  },
  {
    name: "question_text",
    label: "Pregunta",
    value: "",
    list: false,
    required: true,
    colSpan: 4,
  },
  {
    name: "option_1_text",
    label: "Opción 1",
    value: "",
    list: false,
    required: true,
    colSpan: 1,
  },
  {
    name: "option_2_text",
    label: "Opción 2",
    value: "",
    list: false,
    required: true,
    colSpan: 1,
  },
  {
    name: "option_3_text",
    label: "Opción 3",
    value: "",
    list: false,
    required: true,
    colSpan: 1,
  },
  {
    name: "option_4_text",
    label: "Opción 4",
    value: "",
    list: false,
    required: true,
    colSpan: 1,
  },
  {
    name: "correct_option",
    label: "Opción correcta",
    value: "",
    list: true,
    required: true,
    colSpan: 1,
  },
];

export const subjectsFields = [
  {
    name: "id",
    label: "Código",
    value: "",
    required: true,
    colSpan: 1,
  },
  {
    name: "name",
    label: "Nombre",
    value: "",
    required: true,
    colSpan: 2,
  },
];

// grade_level va oculto: se autocompleta desde course_id ("10-1" -> 10) en
// StudentsPage, pero se mantiene en el payload y permite filtrar por grado.
export const studentsFields = [
  {
    name: "id",
    label: "Código",
    value: "",
    required: true,
    colSpan: 1,
  },
  {
    name: "number_list",
    label: "No. Lista",
    value: "",
    required: true,
    colSpan: 1,
  },
  {
    name: "course_id",
    label: "Curso",
    value: "",
    required: true,
    list: true,
    colSpan: 1,
  },
  {
    name: "first_name",
    label: "Primer Nombre",
    value: "",
    required: true,
    colSpan: 2,
  },
  {
    name: "second_name",
    label: "Segundo Nombre",
    value: "",
    required: false,
    colSpan: 2,
  },
  {
    name: "first_lastname",
    label: "Primer Apellido",
    value: "",
    required: true,
    colSpan: 2,
  },
  {
    name: "second_lastname",
    label: "Segundo Apellido",
    value: "",
    required: false,
    colSpan: 2,
  },
  {
    name: "grade_level",
    label: "Grado",
    value: "",
    required: true,
    hidden: true,
    colSpan: 1,
  },
];