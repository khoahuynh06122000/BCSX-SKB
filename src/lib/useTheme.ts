import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'bt_theme';

/**
 * Quan ly che do sang/toi.
 *
 * Cach hoat dong: them/bo class "dark" tren the <html>. Toan bo mau trong
 * index.css duoc dinh nghia lai duoi selector .dark, nen chi can bat/tat class
 * nay la ca app doi mau - khong phai sua gi trong App.tsx.
 *
 * Lan dau vao app: theo cai dat cua he dieu hanh. Sau do ghi nho lua chon
 * cua nguoi dung trong localStorage.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggleTheme, isDark: theme === 'dark' };
}
