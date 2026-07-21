import { useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Хук для сохранения и восстановления позиции скролла при переключении табов.
 * Устраняет дублирование кода в дашбордах Student, Teacher и Admin.
 *
 * @param {string} storagePrefix - префикс для localStorage (напр. 'student', 'teacher', 'admin')
 * @param {string} defaultTab - таб по умолчанию
 * @returns {{ activeTab: string, setActiveTab: (tabId: string) => void }}
 */
export function useScrollRestore(storagePrefix, defaultTab = 'tests') {
  const [searchParams, setSearchParams] = useSearchParams();
  const scrollPositions = useRef({});
  const activeTabRef = useRef(null);

  // Восстанавливаем таб из URL или localStorage
  const getInitialTab = () => {
    const urlTab = searchParams.get('tab');
    if (urlTab) {
      localStorage.setItem(`${storagePrefix}_tab`, urlTab);
      return urlTab;
    }
    return localStorage.getItem(`${storagePrefix}_tab`) || defaultTab;
  };

  // Используем ref для хранения activeTab, чтобы не пересоздавать функции
  const activeTab = getInitialTab();
  activeTabRef.current = activeTab;

  // Сохраняем скролл при скролле
  useEffect(() => {
    const handleScroll = () => {
      scrollPositions.current[activeTabRef.current] = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Восстанавливаем скролл при смене таба
  useEffect(() => {
    const savedPosition = scrollPositions.current[activeTab] || 0;
    const timer = setTimeout(() => {
      window.scrollTo({ top: savedPosition, behavior: 'instant' });
    }, 100);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const setActiveTab = useCallback((tabId) => {
    if (tabId === activeTabRef.current) return;

    // Сохраняем текущую позицию
    scrollPositions.current[activeTabRef.current] = window.scrollY;
    localStorage.setItem(
      `${storagePrefix}_scroll_positions`,
      JSON.stringify(scrollPositions.current)
    );

    // Меняем таб
    activeTabRef.current = tabId;
    localStorage.setItem(`${storagePrefix}_tab`, tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  }, [storagePrefix, setSearchParams]);

  return { activeTab, setActiveTab };
}
