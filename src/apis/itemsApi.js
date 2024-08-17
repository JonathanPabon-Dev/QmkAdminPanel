const apiUrl = "https://qmkadmindb.onrender.com/api";

export async function getItems() {
  try {
    const response = await fetch(`${apiUrl}/items`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function getItemsById(id) {
  try {
    const response = await fetch(`${apiUrl}/items/${id}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function createItems(data) {
  try {
    const response = await fetch(`${apiUrl}/items`, {
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

export async function editItems(id, data) {
  try {
    const response = await fetch(`${apiUrl}/items/${id}`, {
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

export async function deleteItems(id) {
  try {
    const response = await fetch(`${apiUrl}/items/${id}`, {
      method: "DELETE",
    });
    return response.ok;
  } catch (error) {
    console.error(error);
    return false;
  }
}
