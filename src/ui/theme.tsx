import { createContext, useContext } from "solid-js";

export interface Theme {
  bg: string | undefined;
  bgSelected: string;
  bgOverlay: string;
  fg: string;
  fgMuted: string;
  fgFaint: string;
  accent: string;
  accentDim: string;
  title: string;
  link: string;
  success: string;
  warning: string;
  error: string;
  modeNormal: string;
  modeInsert: string;
  modeSearch: string;
  border: string;
  borderFocused: string;
  threadColors: string[];
}

export const hnTheme: Theme = {
  bg: undefined,
  bgSelected: "#2a2a2a",
  bgOverlay: "#1a1a1a",
  fg: "#c9d1d9",
  fgMuted: "#8b949e",
  fgFaint: "#484f58",
  accent: "#ff6600",
  accentDim: "#cc5200",
  title: "#e6edf3",
  link: "#58a6ff",
  success: "#56d364",
  warning: "#e0af68",
  error: "#f85149",
  modeNormal: "#7aa2f7",
  modeInsert: "#73daca",
  modeSearch: "#bb9af7",
  border: "#3a3a4a",
  borderFocused: "#7aa2f7",
  threadColors: [
    "#ff6600",
    "#58a6ff",
    "#7ee787",
    "#d2a8ff",
    "#ffa657",
    "#79c0ff",
    "#56d364",
    "#bc8cff",
  ],
};

const ThemeContext = createContext<Theme>(hnTheme);

export function ThemeProvider(props: { children: any }) {
  return (
    <ThemeContext.Provider value={hnTheme}>
      {props.children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
