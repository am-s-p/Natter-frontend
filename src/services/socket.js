import { io } from "socket.io-client";

let socket = null;

export const connectSocket = (token) => {
  if (!socket && token) {
    socket = io("https://natter-backend-0p2e.onrender.com", {
      auth: { token },
    });
  }
  return socket;
};

export const getSocket = () => socket;