"use client"

import { Sun, Moon } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useEffect } from 'react';

export function AttendanceHeader({ title }: { title: string }) {
  const { theme, toggleTheme } = useStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="flex items-center justify-between p-6">
      <h1 className="text-4xl font-headline font-bold text-foreground">{title}</h1>
      <button
        onClick={toggleTheme}
        className="p-2 rounded-full hover:bg-accent transition-colors"
        aria-label="Toggle Theme"
      >
        {theme === 'dark' ? (
          <Sun className="h-6 w-6 text-secondary" />
        ) : (
          <Moon className="h-6 w-6 text-foreground" />
        )}
      </button>
    </div>
  );
}
