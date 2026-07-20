import { useState, useEffect, useCallback } from 'react';

const KEY = 'edu_theme';

export default function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggle = useCallback(() => setDark(prev => !prev), []);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(KEY, dark ? 'dark' : 'light');
  }, [dark]);

  return { dark, toggle };
}
