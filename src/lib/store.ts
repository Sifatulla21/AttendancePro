import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Student {
  roll: number;
}

export interface ClassData {
  id: string;
  name: string;
  students: Student[];
}

interface AttendanceStore {
  selectedClassId: string | null;
  fineRate: number;
  vibrationEnabled: boolean;
  theme: 'light' | 'dark';

  // Actions
  setSelectedClassId: (id: string | null) => void;
  setFineRate: (rate: number) => void;
  setVibrationEnabled: (enabled: boolean) => void;
  toggleTheme: () => void;
}

export const useStore = create<AttendanceStore>()(
  persist(
    (set) => ({
      selectedClassId: null,
      fineRate: 20,
      vibrationEnabled: true,
      theme: 'dark',

      setSelectedClassId: (id) => set({ selectedClassId: id }),
      setFineRate: (fineRate) => set({ fineRate }),
      setVibrationEnabled: (vibrationEnabled) => set({ vibrationEnabled }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
    }),
    {
      name: 'attend-sync-prefs',
      partialize: (state) => ({ 
        selectedClassId: state.selectedClassId, // Fix: Ensure selected class persists
        fineRate: state.fineRate, 
        vibrationEnabled: state.vibrationEnabled, 
        theme: state.theme 
      }),
    }
  )
);
