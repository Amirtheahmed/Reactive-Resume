// apps/extension/src/libs/axios.ts
import _axios from "axios";

// Use the VITE_API_URL env var, or fallback to localhost for dev
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const axios = _axios.create({
  baseURL,
});
