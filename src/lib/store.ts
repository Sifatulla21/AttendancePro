
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

export interface AttendanceRecord {
  [dateKey: string]: {
    [roll: number]: boolean;
  };
}

export interface OnDayStatus {
  [dateKey: string]: boolean;
}

interface AttendanceStore {
  classes: ClassData[];
  selectedClassId: string | null;
  attendance: {
    [classId: string]: AttendanceRecord;
  };
  onDays: {
    [classId: string]: OnDayStatus;
  };
  fineRate: number;
  vibrationEnabled: boolean;
  theme: 'light' | 'dark';

  // Actions
  addClass: (name: string) => void;
  deleteClass: (id: string) => void;
  editClass: (id: string, name: string) => void;
  setSelectedClassId: (id: string | null) => void;
  addStudent: (classId: string, roll: number) => void;
  deleteStudent: (classId: string, roll: number) => void;
  toggleAttendance: (classId: string, dateKey: string, roll: number) => void;
  toggleOnDay: (classId: string, dateKey: string) => void;
  setFineRate: (rate: number) => void;
  setVibrationEnabled: (enabled: boolean) => void;
  toggleTheme: () => void;
  
  // Local Backup Actions
  importData: (data: string) => void;
  exportData: () => string;
}

export const useStore = create<AttendanceStore>()(
  persist(
    (set, get) => ({
      classes: [
        { id: '1', name: 'Arts Girl I', students: [{ roll: 201 }, { roll: 202 }] },
        { id: '2', name: 'Science I', students: [{ roll: 101 }, { roll: 102 }] },
      ],
      selectedClassId: '1',
      attendance: {},
      onDays: {},
      fineRate: 20,
      vibrationEnabled: true,
      theme: 'dark',

      addClass: (name) => set((state) => ({
        classes: [...state.classes, { id: Date.now().toString(), name, students: [] }]
      })),
      deleteClass: (id) => set((state) => ({
        classes: state.classes.filter(c => c.id !== id),
        selectedClassId: state.selectedClassId === id ? null : state.selectedClassId
      })),
      editClass: (id, name) => set((state) => ({
        classes: state.classes.map(c => c.id === id ? { ...c, name } : c)
      })),
      setSelectedClassId: (id) => set({ selectedClassId: id }),
      addStudent: (classId, roll) => set((state) => ({
        classes: state.classes.map(c => 
          c.id === classId 
            ? { ...c, students: [...c.students.filter(s => s.roll !== roll), { roll }].sort((a, b) => a.roll - b.roll) } 
            : c
        )
      })),
      deleteStudent: (classId, roll) => set((state) => ({
        classes: state.classes.map(c => 
          c.id === classId 
            ? { ...c, students: c.students.filter(s => s.roll !== roll) } 
            : c
        )
      })),
      toggleAttendance: (classId, dateKey, roll) => set((state) => {
        const classAttendance = state.attendance[classId] || {};
        const dateAttendance = classAttendance[dateKey] || {};
        const newStatus = !dateAttendance[roll];
        
        return {
          attendance: {
            ...state.attendance,
            [classId]: {
              ...classAttendance,
              [dateKey]: {
                ...dateAttendance,
                [roll]: newStatus
              }
            }
          }
        };
      }),
      toggleOnDay: (classId, dateKey) => set((state) => {
        const classOnDays = state.onDays[classId] || {};
        return {
          onDays: {
            ...state.onDays,
            [classId]: {
              ...classOnDays,
              [dateKey]: !classOnDays[dateKey]
            }
          }
        };
      }),
      setFineRate: (fineRate) => set({ fineRate }),
      setVibrationEnabled: (vibrationEnabled) => set({ vibrationEnabled }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      
      exportData: () => {
        const state = get();
        const dataToExport = {
          classes: state.classes,
          attendance: state.attendance,
          onDays: state.onDays,
          fineRate: state.fineRate,
        };
        return JSON.stringify(dataToExport);
      },

      importData: (jsonData) => {
        try {
          const parsed = JSON.parse(jsonData);
          set((state) => ({
            ...state,
            ...parsed,
            // Ensure types are maintained
            classes: parsed.classes || state.classes,
            attendance: parsed.attendance || state.attendance,
            onDays: parsed.onDays || state.onDays,
            fineRate: parsed.fineRate ?? state.fineRate,
          }));
        } catch (e) {
          console.error('Failed to import data', e);
        }
      },
    }),
    {
      name: 'attend-sync-storage',
    }
  )
);
