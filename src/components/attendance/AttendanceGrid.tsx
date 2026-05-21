"use client"

import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Check, UserPlus, Trash2, Edit } from 'lucide-react';
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

    const isCurrentlyPresent = !!classAttendance[dateKey]?.[roll];
    const willBePresent = !isCurrentlyPresent;

    // Vibration Logic: Vibrate only if student was absent on previous on-day and is now present
    if (willBePresent && vibrationEnabled && typeof window !== 'undefined' && window.navigator.vibrate) {
      const sortedOnDays = Object.keys(classOnDays)
        .filter(d => classOnDays[d])
        .sort();
      
      const currentIndex = sortedOnDays.indexOf(dateKey);
      if (currentIndex > 0) {
        const prevOnDayKey = sortedOnDays[currentIndex - 1];
        const wasAbsentOnPrev = !classAttendance[prevOnDayKey]?.[roll];
        
        if (wasAbsentOnPrev) {
          window.navigator.vibrate([100, 50, 100]);
        }
      }
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
    <div className="flex-1 flex flex-col space-y-6">
      <div className="bg-card border rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center lg:text-left">
          <h2 className="text-[10px] font-headline text-muted-foreground uppercase tracking-[0.3em]">Viewing Period</h2>
          <MonthSelector currentDate={currentDate} onDateChange={setCurrentDate} />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" className="bg-background rounded-2xl h-12 px-6 text-sm border-muted-foreground/10 hover:bg-primary/5" onClick={() => { setEditClassName(selectedClass.name); setIsEditClassOpen(true); }}>
            <Edit className="h-4 w-4 mr-2" /> Rename
          </Button>
          <Button variant="outline" className="text-destructive border-destructive/10 bg-destructive/5 hover:bg-destructive hover:text-white rounded-2xl h-12 px-6 text-sm transition-colors" onClick={() => deleteClass(selectedClass.id)}>
            <Trash2 className="h-4 w-4 mr-2" /> Remove Class
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white rounded-2xl h-12 px-8 text-sm shadow-lg shadow-primary/20" onClick={() => setIsAddStudentOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Add Student
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border bg-card shadow-lg overflow-hidden border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-technical text-sm">
            <thead>
              <tr className="bg-muted/5 sticky top-0 z-30 border-b">
                <th className="sticky-column z-40 bg-card/95 backdrop-blur-md border-r p-5 font-bold w-24 text-center text-lg">Roll</th>
                {daysInMonth.map(day => (
                  <th key={day.toISOString()} className="p-4 border-r min-w-[60px] text-center">
                    <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-tighter">{format(day, 'EEE')}</div>
                    <div className="text-lg font-bold">{format(day, 'd')}</div>
                  </th>
                ))}
              </tr>
              <tr className="bg-muted/30">
                <th className="sticky-column bg-muted/20 border-r border-b p-3 text-[10px] font-bold uppercase text-center text-primary/70">On-Day</th>
                {daysInMonth.map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const isOnDay = classOnDays[dateKey];
                  return (
                    <td key={day.toISOString()} className="p-3 border-r border-b text-center">
                      <button
                        onClick={() => toggleOnDay(selectedClass.id, dateKey)}
                        className={cn(
                          "h-8 w-8 rounded-xl border-2 transition-all mx-auto flex items-center justify-center",
                          isOnDay ? "bg-primary border-primary text-white shadow-md scale-110" : "bg-background border-muted-foreground/20 text-transparent hover:border-primary/50"
                        )}
                      >
                        {isOnDay && <Check className="h-4 w-4" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {selectedClass.students.map(student => (
                <tr key={student.roll} className="hover:bg-muted/5 transition-colors group">
                  <th className="sticky-column bg-card border-r border-b p-5 text-lg font-bold flex items-center justify-center gap-3">
                    <span className="text-primary">{student.roll}</span>
                    <button onClick={() => deleteStudent(selectedClass.id, student.roll)} className="text-destructive/20 hover:text-destructive transition-all hover:scale-125">
                      <Trash2 className="h-4 w-4" />
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
                          "p-0 border-r border-b min-w-[60px] h-16 transition-all cursor-pointer relative",
                          !isOnDay ? "on-day-off" : (isPresent ? "bg-status-present/20 hover:bg-status-present/30" : "bg-status-absent/20 hover:bg-status-absent/30")
                        )}
                      >
                        {isOnDay && (
                          <div className={cn(
                            "flex items-center justify-center w-full h-full text-2xl font-bold",
                            isPresent ? "text-status-present" : "text-status-absent"
                          )}>
                            {isPresent ? <Check className="h-8 w-8" /> : "A"}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-primary/5 border-t-2 border-primary/20">
                <th className="sticky-column bg-primary/10 border-r p-5 font-headline text-sm font-bold uppercase tracking-wider text-center text-primary">Total Attend</th>
                {daysInMonth.map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const isOnDay = classOnDays[dateKey];
                  const totalPresent = selectedClass.students.filter(s => classAttendance[dateKey]?.[s.roll]).length;
                  return (
                    <td key={day.toISOString()} className="p-4 border-r text-center font-bold text-xl text-primary">
                      {isOnDay ? totalPresent : "-"}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-8">
          <DialogHeader><DialogTitle className="font-headline text-3xl italic">New Student</DialogTitle></DialogHeader>
          <div className="py-6">
            <Input type="number" value={newRoll} onChange={(e) => setNewRoll(e.target.value)} placeholder="Enter Roll Number" className="bg-muted border-none rounded-2xl h-16 text-3xl font-technical text-center" autoFocus />
          </div>
          <DialogFooter><Button onClick={handleAddStudent} className="w-full bg-primary rounded-2xl h-16 text-xl font-headline shadow-lg shadow-primary/20">Enroll Student</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditClassOpen} onOpenChange={setIsEditClassOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-8">
          <DialogHeader><DialogTitle className="font-headline text-3xl italic">Rename Academic Class</DialogTitle></DialogHeader>
          <div className="py-6">
            <Input value={editClassName} onChange={(e) => setEditClassName(e.target.value)} placeholder="Class Identifier" className="bg-muted border-none rounded-2xl h-16 text-2xl font-headline text-center" autoFocus />
          </div>
          <DialogFooter><Button onClick={handleEditClass} className="w-full bg-primary rounded-2xl h-16 text-xl font-headline shadow-lg shadow-primary/20">Update Identity</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
