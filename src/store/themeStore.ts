import { create } from "zustand";
import { persist } from "zustand/middleware";
export type Theme =
  | "black"
  | "blue"
  | "dark-red"
  | "light-red"
  | "light"
  | "grey"
  | "light-blue"
  | "dark-green"
  | "light-green";
interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "blue",
      setTheme: (theme) =>
        set(() => {
          document.documentElement.setAttribute("data-theme", theme);
          return { theme };
        }),
    }),
    {
      name: "synapse-theme",
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.setAttribute("data-theme", state.theme);
        }
      },
    },
  ),
);
