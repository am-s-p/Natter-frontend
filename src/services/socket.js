import { io } from "socket.io-client";

let socket = null;

export const connectSocket = (token) => {
  if (!socket && token) {
    socket = io("http://localhost:5005", {
      auth: { token },
    });
  }
  return socket;
};

export const getSocket = () => socket;