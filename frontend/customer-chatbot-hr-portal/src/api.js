export const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

export const ADMIN_PORTAL_URL = (
  import.meta.env.VITE_ADMIN_URL || "http://localhost:5174"
).replace(/\/$/, "");

export const STORAGE_KEY = "hr-chatbot-demo-user";

export async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Couldn't reach the API. Make sure the FastAPI server is running at " +
        API_URL,
    );
  }

  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const detail = data?.detail;
    throw new Error(
      typeof detail === "string" ? detail : "The request could not be completed.",
    );
  }
  return data;
}

export function getStoredUser() {
  try {
    const user = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    return user && Number.isInteger(user.id) && user.username ? user : null;
  } catch {
    return null;
  }
}
