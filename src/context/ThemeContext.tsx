import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from "react";
import type { Theme } from "@types";
import { loadTheme, saveTheme } from "@utils/storage";

const THEMES: Theme[] = ["light", "dark", "black-rainbow"];

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    loadTheme()
      .then(t => setThemeState(t))
      .catch(err => console.error("Failed to load theme:", err));
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    saveTheme(newTheme).catch(err => console.error("Failed to save theme:", err));
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const idx = THEMES.indexOf(prev);
      const next = THEMES[(idx + 1) % THEMES.length];
      saveTheme(next).catch(err => console.error("Failed to save theme:", err));
      return next;
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "black-rainbow");
    if (theme !== "light") {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
