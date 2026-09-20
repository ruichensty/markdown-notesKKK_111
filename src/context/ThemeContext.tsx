import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
  useCallback,
} from "react";
import type { Theme } from "@types";
import { loadTheme, saveTheme } from "@utils/storage";
import { publishCrossTabChange, subscribeCrossTabChange } from "@utils/crossTabSync";

const THEMES: Theme[] = ["light", "dark", "black-rainbow"];

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const themeRef = useRef<Theme>("light");

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    loadTheme()
      .then(t => {
        themeRef.current = t;
        setThemeState(t);
      })
      .catch(err => console.error("Failed to load theme:", err));
  }, []);

  useEffect(
    () =>
      subscribeCrossTabChange("theme", () => {
        void loadTheme()
          .then(nextTheme => {
            themeRef.current = nextTheme;
            setThemeState(nextTheme);
          })
          .catch(err => console.error("Failed to sync theme:", err));
      }),
    []
  );

  const setTheme = useCallback((newTheme: Theme) => {
    themeRef.current = newTheme;
    setThemeState(newTheme);
    saveTheme(newTheme)
      .then(() => publishCrossTabChange("theme"))
      .catch(err => console.error("Failed to save theme:", err));
  }, []);

  const toggleTheme = useCallback(() => {
    const idx = THEMES.indexOf(themeRef.current);
    const next = THEMES[(idx + 1) % THEMES.length];
    themeRef.current = next;
    setThemeState(next);
    saveTheme(next)
      .then(() => publishCrossTabChange("theme"))
      .catch(err => console.error("Failed to save theme:", err));
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
