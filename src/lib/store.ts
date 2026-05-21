
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
  hasHydrated: boolean;

  // Actions
  setSelectedClassId: (id: string | null) => void;
  setFineRate: (rate: number) => void;
  setVibrationEnabled: (enabled: boolean) => void;
  toggleTheme: () => void;
  setHasHydrated: (val: boolean) => void;
  importData: (json: string) => void;
  exportData: () => string;
}

export const useStore = create<AttendanceStore>()(
  persist(
    (set, get) => ({
      selectedClassId: null,
      fineRate: 20,
      vibrationEnabled: true,
      theme: 'dark',
      hasHydrated: false,

      setSelectedClassId: (id) => set({ selectedClassId: id }),
      setFineRate: (fineRate) => set({ fineRate }),
      setVibrationEnabled: (vibrationEnabled) => set({ vibrationEnabled }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setHasHydrated: (val) => set({ hasHydrated: val }),
      
      exportData: () => {
        const state = get();
        return JSON.stringify({
          fineRate: state.fineRate,
          vibrationEnabled: state.vibrationEnabled,
          theme: state.theme,
          selectedClassId: state.selectedClassId
        });
      },
      
      importData: (json) => {
        try {
          const data = JSON.parse(json);
          set({
            fineRate: data.fineRate ?? 20,
            vibrationEnabled: data.vibrationEnabled ?? true,
            theme: data.theme ?? 'dark',
            selectedClassId: data.selectedClassId ?? null
          });
        } catch (e) {
          throw new Error("Invalid backup file format");
        }
      }
    }),
    {
      name: 'attend-sync-prefs-v6', // Incremented version to ensure clean hydration
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({ 
        selectedClassId: state.selectedClassId,
        fineRate: state.fineRate, 
        vibrationEnabled: state.vibrationEnabled, 
        theme: state.theme 
      }),
    }
  )
);
