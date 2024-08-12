export function validateForm(formFields) {
  let isValid = true;

  Array.prototype.forEach.call(formFields, (field) => {
    const fieldType = field.type;
    const fieldValue = field.value;
    const fieldRequired = field.required;

    // Validar campos requeridos
    if (fieldRequired && !fieldValue) {
      isValid = false;
      field.classList.add("border-red-500");
    }

    // Validar campos de tipo número
    if (fieldType === "number" && fieldValue) {
      const fieldValueAsNumber = parseFloat(fieldValue);
      if (isNaN(fieldValueAsNumber) || fieldValueAsNumber < 0) {
        isValid = false;
        field.classList.add("border-red-500");
      }
    }

    // Validar campos de tipo texto
    if (fieldType === "text" && fieldValue) {
      const fieldValueTrimmed = fieldValue.trim();
      if (fieldValueTrimmed.length < 3) {
        isValid = false;
        field.classList.add("border-red-500");
      }
    }
  });

  return isValid;
}
