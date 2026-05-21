
"use client"

import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Check, X, UserPlus, Trash2, Edit } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MonthSelector } from './MonthSelector';

export function AttendanceGrid() {
  const { 
    classes, 
    selectedClassId, 
    attendance, 
    onDays, 
    toggleAttendance, 
    toggleOnDay,
    addStudent,
    deleteStudent,
    deleteClass,
    editClass,
    vibrationEnabled
  } = useStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newRoll, setNewRoll] = useState('');
  const [isEditClassOpen, setIsEditClassOpen] = useState(false);
  const [editClassName, setEditClassName] = useState('');

  // Automatic Month Selection: Default to current month if not already set
  useEffect(() => {
    const now = new Date();
    if (currentDate.getMonth() !== now.getMonth() || currentDate.getFullYear() !== now.getFullYear()) {
      // We keep the state-driven date, but this ensures we start with current
    }
  }, []);

  const selectedClass = classes.find(c => c.id === selectedClassId);

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate)
    });
  }, [currentDate]);

  if (!selectedClass) return null;

  const classAttendance = attendance[selectedClass.id] || {};
  const classOnDays = onDays[selectedClass.id] || {};

  const handleToggleAttendance = (dateKey: string, roll: number) => {
    if (!classOnDays[dateKey]) return;

    if (vibrationEnabled && typeof window !== 'undefined' && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }

    toggleAttendance(selectedClass.id, dateKey, roll);
  };

  const handleAddStudent = () => {
    const rollNum = parseInt(newRoll);
    if (!isNaN(rollNum)) {
      addStudent(selectedClass.id, rollNum);
      setNewRoll('');
      setIsAddStudentOpen(false);
    }
  };

  const handleEditClass = () => {
    if (editClassName.trim()) {
      editClass(selectedClass.id, editClassName.trim());
      setIsEditClassOpen(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background px-4 md:px-6 overflow-hidden">
      <div className="py-4 space-y-2">
        <h2 className="text-xs font-headline text-muted-foreground uppercase tracking-[0.2em] text-center">Period</h2>
        <MonthSelector currentDate={currentDate} onDateChange={setCurrentDate} />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Button 
          variant="outline" 
          className="bg-secondary/10 text-secondary-foreground border-secondary/20 rounded-xl h-12 text-xs"
          onClick={() => {
            setEditClassName(selectedClass.name);
            setIsEditClassOpen(true);
          }}
        >
          <Edit className="h-3.5 w-3.5 mr-1.5" />
          Edit
        </Button>
        <Button 
          variant="destructive" 
          className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive hover:text-white rounded-xl h-12 text-xs"
          onClick={() => deleteClass(selectedClass.id)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Delete
        </Button>
        <Button 
          className="bg-primary text-white rounded-xl h-12 text-xs shadow-md shadow-primary/20"
          onClick={() => setIsAddStudentOpen(true)}
        >
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          Add
        </Button>
      </div>

      <div className="flex-1 overflow-auto rounded-2xl border bg-card shadow-inner relative mb-4">
        <table className="w-full border-collapse font-technical text-sm">
          <thead>
            <tr className="bg-card sticky top-0 z-30">
              <th className="sticky-column sticky top-0 z-40 bg-card border-r border-b p-3 font-bold w-16 text-center">Roll</th>
              {daysInMonth.map(day => (
                <th key={day.toISOString()} className="p-2 border-b border-r min-w-[50px] text-center bg-card">
                  <div className="text-[9px] uppercase text-muted-foreground font-bold">{format(day, 'EEE')}</div>
                  <div className="text-xs font-bold">{format(day, 'd')}</div>
                </th>
              ))}
            </tr>
            <tr className="bg-muted/30">
              <th className="sticky-column bg-muted/30 border-r border-b p-2 text-[10px] font-bold uppercase text-center">Working</th>
              {daysInMonth.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const isOnDay = classOnDays[dateKey];
                return (
                  <td key={day.toISOString()} className="p-2 border-r border-b text-center">
                    <button
                      onClick={() => toggleOnDay(selectedClass.id, dateKey)}
                      className={cn(
                        "h-6 w-6 rounded-lg border-2 transition-all mx-auto flex items-center justify-center",
                        isOnDay 
                          ? "bg-primary border-primary text-white scale-110" 
                          : "border-muted-foreground/20 text-transparent"
                      )}
                    >
                      {isOnDay && <Check className="h-3 w-3" />}
                    </button>
                  </td>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {selectedClass.students.map(student => (
              <tr key={student.roll} className="hover:bg-muted/5 transition-colors group">
                <th className="sticky-column border-r border-b p-3 text-sm font-bold flex items-center justify-center gap-2">
                  <span>{student.roll}</span>
                  <button 
                    onClick={() => deleteStudent(selectedClass.id, student.roll)} 
                    className="text-destructive/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </th>
                {daysInMonth.map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const isOnDay = classOnDays[dateKey];
                  const isPresent = classAttendance[dateKey]?.[student.roll];
                  return (
                    <td
                      key={day.toISOString()}
                      onClick={() => handleToggleAttendance(dateKey, student.roll)}
                      className={cn(
                        "p-0 border-r border-b min-w-[50px] h-12 transition-all cursor-pointer relative",
                        !isOnDay ? "on-day-off" : (isPresent ? "bg-status-present text-white shadow-inner" : "bg-status-absent text-white shadow-inner")
                      )}
                    >
                      {isOnDay && isPresent && (
                        <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in-50">
                          <Check className="h-5 w-5" />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/10 border-t font-bold">
            <tr>
              <th className="sticky-column bg-muted/20 border-r p-3 text-[10px] uppercase text-center">Total</th>
              {daysInMonth.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const presentCount = selectedClass.students.reduce((acc, s) => acc + (classAttendance[dateKey]?.[s.roll] ? 1 : 0), 0);
                return (
                  <td key={day.toISOString()} className="p-3 border-r text-center text-xs">
                    {presentCount}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl italic">Add Student</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="number"
              value={newRoll}
              onChange={(e) => setNewRoll(e.target.value)}
              placeholder="Roll Number"
              className="bg-muted border-none rounded-xl h-14 text-xl font-technical text-center"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddStudentOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleAddStudent} className="bg-primary rounded-xl px-8">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditClassOpen} onOpenChange={setIsEditClassOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl italic">Edit Class Name</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editClassName}
              onChange={(e) => setEditClassName(e.target.value)}
              placeholder="e.g. Science I"
              className="bg-muted border-none rounded-xl h-14 text-lg font-headline text-center"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditClassOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleEditClass} className="bg-primary rounded-xl px-8">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
