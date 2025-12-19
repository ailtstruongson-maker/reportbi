
import { useEffect, useCallback } from 'react';
import { useIndexedDBState } from './useIndexedDBState';

type Theme = 'light' | 'dark';

const useTheme = (): [Theme, () => void] => {
  // Determine system preference for default value
  const systemTheme: Theme = (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';

  // Use IndexedDB state instead of local state + localStorage
  const [theme, setTheme] = useIndexedDBState<Theme>('app-theme', systemTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme: Theme) => (prevTheme === 'light' ? 'dark' : 'light'));
  }, [setTheme]);

  return [theme, toggleTheme];
};

export default useTheme;
