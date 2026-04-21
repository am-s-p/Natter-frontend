import axios from "axios";

const API = axios.create({
  baseURL: "https://natter-backend-0p2e.onrender.com/api",
});

export default API;