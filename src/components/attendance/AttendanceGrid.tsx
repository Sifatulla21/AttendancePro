"use client"

import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Check, Edit2, X, ChevronLeft, ChevronRight, UserPlus, Trash2, Edit } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleToggleAttendance = (dateKey: string, roll: number) => {
    if (!classOnDays[dateKey]) return;

    // Vibration Logic
    if (vibrationEnabled) {
      const isCurrentlyPresent = classAttendance[dateKey]?.[roll];
      if (!isCurrentlyPresent) {
        // Find previous On-Day
        const sortedOnDays = Object.keys(classOnDays)
          .filter(k => classOnDays[k])
          .sort((a, b) => b.localeCompare(a));
        
        const currentIndex = sortedOnDays.indexOf(dateKey);
        const prevOnDayKey = sortedOnDays[currentIndex + 1];

        if (prevOnDayKey && !classAttendance[prevOnDayKey]?.[roll]) {
          if (typeof window !== 'undefined' && window.navigator.vibrate) {
            window.navigator.vibrate(100);
          }
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
    <div className="flex-1 flex flex-col min-h-0 bg-background mb-16 px-6 pb-20 overflow-hidden">
      {/* Date Picker Header */}
      <div className="py-6 space-y-4">
        <h2 className="text-lg font-headline text-muted-foreground uppercase tracking-wider text-center">Select Month</h2>
        <div className="flex items-center justify-between bg-card p-2 rounded-xl border">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="text-primary hover:bg-accent">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <span className="text-xl font-headline font-bold">{format(currentDate, 'MMMM yyyy')}</span>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="text-primary hover:bg-accent">
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Button 
          variant="outline" 
          className="bg-secondary text-secondary-foreground border-none rounded-xl py-6"
          onClick={() => {
            setEditClassName(selectedClass.name);
            setIsEditClassOpen(true);
          }}
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Class
        </Button>
        <Button 
          variant="destructive" 
          className="bg-destructive text-white rounded-xl py-6"
          onClick={() => deleteClass(selectedClass.id)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
        <Button 
          className="bg-primary text-white rounded-xl py-6"
          onClick={() => setIsAddStudentOpen(true)}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto rounded-xl border relative">
        <table className="w-full border-collapse font-technical">
          <thead>
            {/* Date Header Row - Sticky */}
            <tr className="bg-card sticky top-0 z-30">
              <th className="sticky-column sticky top-0 z-40 bg-card border-r border-b p-3 text-sm font-bold w-20">Roll</th>
              {daysInMonth.map(day => (
                <th key={day.toISOString()} className="p-3 border-b border-r min-w-[60px] text-center bg-card">
                  <div className="text-[10px] uppercase text-muted-foreground font-bold">{format(day, 'EEE')}</div>
                  <div className="text-sm font-bold">{format(day, 'd')}</div>
                </th>
              ))}
            </tr>
            {/* On Day Row - Not Sticky */}
            <tr className="bg-muted/50">
              <th className="sticky-column bg-muted/50 border-r border-b p-2 text-xs font-bold">On Day</th>
              {daysInMonth.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const isOnDay = classOnDays[dateKey];
                return (
                  <td key={day.toISOString()} className="p-2 border-r border-b text-center">
                    <button
                      onClick={() => toggleOnDay(selectedClass.id, dateKey)}
                      className={cn(
                        "h-6 w-6 rounded-full border-2 transition-all mx-auto flex items-center justify-center",
                        isOnDay 
                          ? "bg-primary border-primary text-white" 
                          : "border-muted-foreground/30 text-transparent"
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
              <tr key={student.roll} className="hover:bg-muted/10 transition-colors">
                <th className="sticky-column border-r border-b p-3 text-sm font-bold flex items-center justify-between gap-2 group">
                  <span>{student.roll}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => deleteStudent(selectedClass.id, student.roll)} className="text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
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
                        "p-0 border-r border-b min-w-[60px] h-12 transition-all cursor-pointer relative",
                        !isOnDay ? "on-day-off" : (isPresent ? "bg-status-present text-white" : "bg-status-absent text-white")
                      )}
                    >
                      {isOnDay && isPresent && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check className="h-5 w-5" />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-card border-t font-bold">
            <tr>
              <th className="sticky-column bg-card border-r p-3 text-xs">Present</th>
              {daysInMonth.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const presentCount = selectedClass.students.reduce((acc, s) => acc + (classAttendance[dateKey]?.[s.roll] ? 1 : 0), 0);
                return (
                  <td key={day.toISOString()} className="p-3 border-r text-center text-sm">
                    {presentCount}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Modals */}
      <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="number"
              value={newRoll}
              onChange={(e) => setNewRoll(e.target.value)}
              placeholder="Enter Student Roll (e.g. 201)"
              className="bg-muted border-none"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddStudentOpen(false)}>Cancel</Button>
            <Button onClick={handleAddStudent}>Add Student</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditClassOpen} onOpenChange={setIsEditClassOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Class Name</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editClassName}
              onChange={(e) => setEditClassName(e.target.value)}
              placeholder="e.g. Science I"
              className="bg-muted border-none"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditClassOpen(false)}>Cancel</Button>
            <Button onClick={handleEditClass}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
