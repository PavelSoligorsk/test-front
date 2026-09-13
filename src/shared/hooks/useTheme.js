import { useState, useEffect, useCallback } from 'react';

const KEY = 'edu_theme';

function applyTheme(dark) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.style.backgroundColor = dark ? '#09090b' : '#fafafa';
}

function readIsDark() {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return true;
  }
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') return saved === 'dark';
  } catch (e) {}
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

export default function useTheme() {
  const [dark, setDark] = useState(readIsDark);

  const toggle = useCallback(() => setDark((prev) => !prev), []);

  useEffect(() => {
    applyTheme(dark);
    try {
      localStorage.setItem(KEY, dark ? 'dark' : 'light');
    } catch (e) {}
  }, [dark]);

  return { dark, toggle };
}
