export const itemsFields = [
  {
    name: "value1",
    label: "Valor 1",
    value: "",
    required: true,
  },
  {
    name: "value2",
    label: "Valor 2",
    value: "",
    required: true,
  },
  {
    name: "topic",
    label: "Tema",
    value: "",
    required: true,
  },
];

export const parametersFields = [
  {
    name: "name",
    label: "Parámetro",
    value: "",
    required: true,
  },
  {
    name: "value",
    label: "Valor",
    value: "",
    required: true,
  },
];

export const quizzesFields = [
  {
    name: "id",
    label: "ID",
    value: "",
    required: true,
  },
  {
    name: "topic",
    label: "Tema",
    value: "",
    required: true,
  },
  {
    name: "grade_level",
    label: "Grado",
    value: "",
    required: true,
  },
  {
    name: "subject_id",
    label: "Asignatura",
    value: "",
    required: false,
  },
  {
    name: "available_since",
    label: "Fecha Desde",
    value: "",
    required: true,
  },
  {
    name: "available_until",
    label: "Fecha Hasta",
    value: "",
    required: false,
  },
];

export const questionsFields = [
  {
    name: "id",
    label: "ID",
    value: "",
    list: false,
    required: true,
  },
  {
    name: "quiz_id",
    label: "Quiz/Prueba",
    value: "",
    list: true,
    required: true,
  },
  {
    name: "question_text",
    label: "Pregunta",
    value: "",
    list: false,
    required: true,
  },
  {
    name: "option_1_text",
    label: "Opción 1",
    value: "",
    list: false,
    required: true,
  },
  {
    name: "option_2_text",
    label: "Opción 2",
    value: "",
    list: false,
    required: true,
  },
  {
    name: "option_3_text",
    label: "Opción 3",
    value: "",
    list: false,
    required: true,
  },
  {
    name: "option_4_text",
    label: "Opción 4",
    value: "",
    list: false,
    required: true,
  },
  {
    name: "correct_option",
    label: "Opción correcta",
    value: "",
    list: true,
    required: true,
  },
];

export const subjectsFields = [
  {
    name: "id",
    label: "Código",
    value: "",
    required: true,
  },
  {
    name: "name",
    label: "Nombre",
    value: "",
    required: true,
  },
];

export const studentsFields = [
  {
    name: "id",
    label: "Código",
    value: "",
    required: true,
  },
  {
    name: "number_list",
    label: "No. Lista",
    value: "",
    required: true,
  },
  {
    name: "first_name",
    label: "Primer Nombre",
    value: "",
    required: true,
  },
  {
    name: "second_name",
    label: "Segundo Nombre",
    value: "",
    required: false,
  },
  {
    name: "first_lastname",
    label: "Primer Apellido",
    value: "",
    required: true,
  },
  {
    name: "second_lastname",
    label: "Segundo Apellido",
    value: "",
    required: false,
  },
  {
    name: "grade_level",
    label: "Grado",
    value: "",
    required: true,
  },
  {
    name: "course",
    label: "Curso/Salón",
    value: "",
    required: true,
  },
];
