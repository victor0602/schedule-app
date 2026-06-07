import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const TOKEN_KEY = "schedule.accessToken";
const REFRESH_KEY = "schedule.refreshToken";

function getDefaultBaseURL() {
  if (Platform.OS === "web") {
    return "/api/v1";
  }
  return "http://localhost:3000/api/v1";
}

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

export const api: AxiosInstance = axios.create({
  baseURL: getDefaultBaseURL(),
  timeout: 15000,
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401) {
      const refresh = await AsyncStorage.getItem(REFRESH_KEY);
      if (refresh) {
        try {
          const res = await axios.post(
            `${getDefaultBaseURL()}/auth/refresh`,
            { refreshToken: refresh },
          );
          await AsyncStorage.setItem(TOKEN_KEY, res.data.accessToken);
          await AsyncStorage.setItem(REFRESH_KEY, res.data.refreshToken);
          err.config.headers.set(
            "Authorization",
            `Bearer ${res.data.accessToken}`,
          );
          return api.request(err.config);
        } catch {
          await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY]);
          onUnauthorized?.();
        }
      } else {
        onUnauthorized?.();
      }
    }
    return Promise.reject(err);
  },
);

export async function setTokens(access: string, refresh: string) {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, access],
    [REFRESH_KEY, refresh],
  ]);
}

export async function getAccessToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearTokens() {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY]);
}
