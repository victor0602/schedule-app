import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setTokens, clearTokens } from "./api";
import type { AuthResponse, User } from "@schedule/shared";

interface AuthState {
  user: User | null;
  loading: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  hydrate: async () => {
    try {
      const res = await api.post<AuthResponse["user"]>("/auth/me");
      set({ user: res.data, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  login: async (email, password) => {
    const res = await api.post<AuthResponse>("/auth/login", { email, password });
    await setTokens(res.data.accessToken, res.data.refreshToken);
    set({ user: res.data.user });
  },
  register: async (email, password, displayName) => {
    const res = await api.post<AuthResponse>("/auth/register", {
      email,
      password,
      displayName,
    });
    await setTokens(res.data.accessToken, res.data.refreshToken);
    set({ user: res.data.user });
  },
  logout: async () => {
    await clearTokens();
    set({ user: null });
  },
}));
