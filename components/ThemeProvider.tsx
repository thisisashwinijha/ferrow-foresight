'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setCustomTheme] = useState<Theme>('light');

  const applyTheme = (nextTheme: Theme) => {
    setCustomTheme(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ferrow-theme', nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
    }
  };

  useEffect(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlTheme = params?.get('theme') as Theme | null;
    const saved = typeof window !== 'undefined' ? (localStorage.getItem('ferrow-theme') as Theme | null) : null;
    const initial = (urlTheme === 'light' || urlTheme === 'dark') ? urlTheme : (saved || 'light');
    applyTheme(initial);
  }, []);

  const toggleTheme = () => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: applyTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
