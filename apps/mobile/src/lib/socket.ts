import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./api";
import { SOCKET_EVENTS } from "@schedule/shared";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@schedule/shared";
import { Platform } from "react-native";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

function getDefaultURL() {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && (window as any).__API_URL__) {
      return (window as any).__API_URL__.replace(/\/api\/v1$/, "");
    }
    return "http://localhost:3000";
  }
  return "http://localhost:3000";
}

export async function getSocket() {
  if (socket?.connected) return socket;
  const token = await getAccessToken();
  socket = io(getDefaultURL(), {
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: true,
  });
  return socket;
}

export function subscribeSchedule(scheduleId: string) {
  if (!socket) return;
  socket.emit(SOCKET_EVENTS.SUBSCRIBE, { scheduleId });
}

export function unsubscribeSchedule(scheduleId: string) {
  if (!socket) return;
  socket.emit(SOCKET_EVENTS.UNSUBSCRIBE, { scheduleId });
}
