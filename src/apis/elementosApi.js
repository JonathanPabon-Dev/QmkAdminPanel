const apiUrl = "https://qmkadmindb.onrender.com/api";

export async function getElementos() {
  try {
    const response = await fetch(`${apiUrl}/elementos`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function getElementosById(id) {
  try {
    const response = await fetch(`${apiUrl}/elementos/${id}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function createElementos(data) {
  try {
    const response = await fetch(`${apiUrl}/elementos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const newData = await response.json();
    return newData;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function editElementos(id, data) {
  try {
    const response = await fetch(`${apiUrl}/elementos/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const updatedData = await response.json();
    return updatedData;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function deleteElementos(id) {
  try {
    const response = await fetch(`${apiUrl}/elementos/${id}`, {
      method: "DELETE",
    });
    return response.ok;
  } catch (error) {
    console.error(error);
    return false;
  }
}
