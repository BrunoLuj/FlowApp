import axios from "axios";
import useStore from "../store/index.js";

// const API_URL = `http://192.168.0.20:5000/api-v1`;
const API_URL = `http://localhost:5000/api-v1`;

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor za hvatanje 401 greške
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      const { signOut } = useStore.getState();
      signOut(); // Odjavi korisnika na 401 grešku
      console.warn("Korisnik nije autorizovan. Odjava je izvršena.");
    }
    return Promise.reject(error);
  }
);


export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

export default api;