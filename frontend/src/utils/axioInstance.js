import axios from "axios";

const BASE_URL = "http://localhost:3000/api";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

// 🧩 Add a request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (!(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    } else {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;

