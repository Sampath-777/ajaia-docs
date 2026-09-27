const API_URL = import.meta.env.PROD
  ? ""
  : import.meta.env.VITE_API_URL || "http://192.168.31.67:5000";

export async function api(path, options = {}) {
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(!isFormData && options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });

  let result;

  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (!response.ok) {
    const error = new Error(
      result.message || `Request failed (${response.status})`
    );

    error.status = response.status;

    throw error;
  }

  return result;
}
