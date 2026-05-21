
"use client"

import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Check, X, UserPlus, Trash2, Edit } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { useState, useMemo } from 'react';
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
      <div className="py-2 space-y-2">
        <h2 className="text-[10px] font-headline text-muted-foreground uppercase tracking-[0.3em] text-center">Academic Period</h2>
        <MonthSelector currentDate={currentDate} onDateChange={setCurrentDate} />
      </div>

      <div className="grid grid-cols-3 gap-2 my-4">
        <Button variant="outline" className="bg-card rounded-xl h-10 text-xs border-muted-foreground/10" onClick={() => { setEditClassName(selectedClass.name); setIsEditClassOpen(true); }}>
          <Edit className="h-3.5 w-3.5 mr-1" /> Edit
        </Button>
        <Button variant="outline" className="text-destructive border-destructive/10 bg-destructive/5 hover:bg-destructive hover:text-white rounded-xl h-10 text-xs" onClick={() => deleteClass(selectedClass.id)}>
          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
        </Button>
        <Button className="bg-primary text-white rounded-xl h-10 text-xs" onClick={() => setIsAddStudentOpen(true)}>
          <UserPlus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>

      <div className="flex-1 overflow-auto rounded-2xl border bg-card shadow-inner relative mb-2">
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
            <tr className="bg-muted/10">
              <th className="sticky-column bg-muted/20 border-r border-b p-2 text-[8px] font-bold uppercase text-center">On-Day</th>
              {daysInMonth.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const isOnDay = classOnDays[dateKey];
                return (
                  <td key={day.toISOString()} className="p-2 border-r border-b text-center">
                    <button
                      onClick={() => toggleOnDay(selectedClass.id, dateKey)}
                      className={cn(
                        "h-6 w-6 rounded-lg border transition-all mx-auto flex items-center justify-center",
                        isOnDay ? "bg-primary border-primary text-white" : "border-muted-foreground/30 text-transparent"
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
                <th className="sticky-column bg-card border-r border-b p-3 text-sm font-bold flex items-center justify-center gap-2">
                  <span>{student.roll}</span>
                  <button onClick={() => deleteStudent(selectedClass.id, student.roll)} className="text-destructive/30 hover:text-destructive transition-opacity">
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
                        !isOnDay ? "on-day-off" : (isPresent ? "bg-status-present text-white" : "bg-status-absent text-white")
                      )}
                    >
                      {isOnDay && isPresent && <Check className="h-5 w-5 mx-auto opacity-80" />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Student Dialog */}
      <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="font-headline text-2xl">New Student</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input type="number" value={newRoll} onChange={(e) => setNewRoll(e.target.value)} placeholder="Roll Number" className="bg-muted border-none rounded-xl h-14 text-2xl font-technical text-center" autoFocus />
          </div>
          <DialogFooter><Button onClick={handleAddStudent} className="bg-primary rounded-xl px-10 h-12">Add to List</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog open={isEditClassOpen} onOpenChange={setIsEditClassOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="font-headline text-2xl">Rename Class</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input value={editClassName} onChange={(e) => setEditClassName(e.target.value)} placeholder="Class Name" className="bg-muted border-none rounded-xl h-14 text-lg font-headline text-center" autoFocus />
          </div>
          <DialogFooter><Button onClick={handleEditClass} className="bg-primary rounded-xl px-10 h-12">Save Name</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
