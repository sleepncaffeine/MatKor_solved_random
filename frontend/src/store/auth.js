import { create } from "zustand";

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem("access_token"),

  setUser: (user) => set({ user, isAuthenticated: true }),

  login: (tokens, user) => {
    localStorage.setItem("access_token", tokens.access_token);
    localStorage.setItem("refresh_token", tokens.refresh_token);
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
