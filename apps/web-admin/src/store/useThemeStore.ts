import { create } from 'zustand';

interface ThemeState {
  dark: boolean;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'pospe-theme';

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}

function initialTheme(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) return stored === 'dark';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

const initial = initialTheme();
if (typeof document !== 'undefined') applyTheme(initial);

export const useThemeStore = create<ThemeState>((set, get) => ({
  dark: initial,
  toggleTheme: () => {
    const next = !get().dark;
    applyTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    set({ dark: next });
  },
}));
