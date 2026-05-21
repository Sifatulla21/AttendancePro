
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
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, setDoc, deleteDoc, collection, query, where, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function AttendanceGrid() {
  const { user } = useUser();
  const db = useFirestore();
  const { 
    selectedClassId, 
    setSelectedClassId,
    vibrationEnabled
  } = useStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newRoll, setNewRoll] = useState('');
  const [isEditClassOpen, setIsEditClassOpen] = useState(false);
  const [editClassName, setEditClassName] = useState('');

  // Fetch Class Metadata
  const classRef = useMemo(() => {
    if (!user || !selectedClassId) return null;
    return doc(db, 'users', user.uid, 'classes', selectedClassId);
  }, [db, user, selectedClassId]);
  const { data: selectedClass } = useDoc<any>(classRef);

  // Fetch Attendance & OnDays for the month
  const attendanceQuery = useMemo(() => {
    if (!user || !selectedClassId) return null;
    return query(
      collection(db, 'users', user.uid, 'attendance'),
      where('classId', '==', selectedClassId)
    );
  }, [db, user, selectedClassId]);
  const { data: attendanceDocs } = useCollection<any>(attendanceQuery);

  const onDaysQuery = useMemo(() => {
    if (!user || !selectedClassId) return null;
    return query(
      collection(db, 'users', user.uid, 'onDays'),
      where('classId', '==', selectedClassId)
    );
  }, [db, user, selectedClassId]);
  const { data: onDaysDocs } = useCollection<any>(onDaysQuery);

  const classAttendance = useMemo(() => {
    const map: any = {};
    attendanceDocs?.forEach(doc => {
      map[doc.dateKey] = doc.data;
    });
    return map;
  }, [attendanceDocs]);

  const classOnDays = useMemo(() => {
    const map: any = {};
    onDaysDocs?.forEach(doc => {
      map[doc.dateKey] = true;
    });
    return map;
  }, [onDaysDocs]);

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate)
    });
  }, [currentDate]);

  if (!selectedClass || !user) return null;

  const handleToggleAttendance = (dateKey: string, roll: number) => {
    if (!classOnDays[dateKey]) return;

    const currentDayData = classAttendance[dateKey] || {};
    const isCurrentlyPresent = !!currentDayData[roll];
    const willBePresent = !isCurrentlyPresent;

    // Vibration Logic
    if (willBePresent && vibrationEnabled && typeof window !== 'undefined' && window.navigator.vibrate) {
      const sortedOnDays = Object.keys(classOnDays).sort();
      const currentIndex = sortedOnDays.indexOf(dateKey);
      if (currentIndex > 0) {
        const prevOnDayKey = sortedOnDays[currentIndex - 1];
        const wasAbsentOnPrev = !classAttendance[prevOnDayKey]?.[roll];
        if (wasAbsentOnPrev) window.navigator.vibrate([100, 50, 100]);
      }
    }

    const docId = `${selectedClassId}_${dateKey}`;
    const docRef = doc(db, 'users', user.uid, 'attendance', docId);
    
    setDoc(docRef, {
      classId: selectedClassId,
      dateKey,
      data: { ...currentDayData, [roll]: willBePresent }
    }, { merge: true }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'write',
        requestResourceData: { [roll]: willBePresent }
      }));
    });
  };

  const handleToggleOnDay = (dateKey: string) => {
    const docId = `${selectedClassId}_${dateKey}`;
    const docRef = doc(db, 'users', user.uid, 'onDays', docId);
    
    if (classOnDays[dateKey]) {
      deleteDoc(docRef);
    } else {
      setDoc(docRef, { classId: selectedClassId, dateKey, active: true });
    }
  };

  const handleAddStudent = () => {
    const rollNum = parseInt(newRoll);
    if (!isNaN(rollNum) && classRef) {
      const updatedStudents = [...(selectedClass.students || []).filter((s: any) => s.roll !== rollNum), { roll: rollNum }]
        .sort((a, b) => a.roll - b.roll);
      
      updateDoc(classRef, { students: updatedStudents });
      setNewRoll('');
      setIsAddStudentOpen(false);
    }
  };

  const handleDeleteStudent = (roll: number) => {
    if (classRef) {
      const updatedStudents = (selectedClass.students || []).filter((s: any) => s.roll !== roll);
      updateDoc(classRef, { students: updatedStudents });
    }
  };

  const handleDeleteClass = () => {
    if (classRef) {
      deleteDoc(classRef);
      setSelectedClassId(null);
    }
  };

  const handleEditClass = () => {
    if (editClassName.trim() && classRef) {
      updateDoc(classRef, { name: editClassName.trim() });
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
          <Button variant="outline" className="text-destructive border-destructive/10 bg-destructive/5 hover:bg-destructive hover:text-white rounded-2xl h-12 px-6 text-sm transition-colors" onClick={handleDeleteClass}>
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
                        onClick={() => handleToggleOnDay(dateKey)}
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
              {(selectedClass.students || []).map((student: any) => (
                <tr key={student.roll} className="hover:bg-muted/5 transition-colors group">
                  <th className="sticky-column bg-card border-r border-b p-5 text-lg font-bold flex items-center justify-center gap-3">
                    <span className="text-primary">{student.roll}</span>
                    <button onClick={() => handleDeleteStudent(student.roll)} className="text-destructive/20 hover:text-destructive transition-all hover:scale-125">
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
                  const totalPresent = (selectedClass.students || []).filter((s: any) => classAttendance[dateKey]?.[s.roll]).length;
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
