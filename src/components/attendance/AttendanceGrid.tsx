
"use client"

import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Check, UserPlus, Trash2, Edit, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { useState, useMemo, useEffect } from 'react';
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
    vibrationEnabled,
    hasHydrated
  } = useStore();

  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newRoll, setNewRoll] = useState('');
  const [isEditClassOpen, setIsEditClassOpen] = useState(false);
  const [editClassName, setEditClassName] = useState('');

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const classRef = useMemo(() => {
    if (!user || !selectedClassId || !hasHydrated) return null;
    return doc(db, 'users', user.uid, 'classes', selectedClassId);
  }, [db, user, selectedClassId, hasHydrated]);
  
  const { data: selectedClass, loading: classLoading } = useDoc<any>(classRef);

  const attendanceQuery = useMemo(() => {
    if (!user || !selectedClassId || !hasHydrated) return null;
    return query(
      collection(db, 'users', user.uid, 'attendance'),
      where('classId', '==', selectedClassId)
    );
  }, [db, user, selectedClassId, hasHydrated]);
  
  const { data: attendanceDocs, loading: attendanceLoading } = useCollection<any>(attendanceQuery);

  const onDaysQuery = useMemo(() => {
    if (!user || !selectedClassId || !hasHydrated) return null;
    return query(
      collection(db, 'users', user.uid, 'onDays'),
      where('classId', '==', selectedClassId)
    );
  }, [db, user, selectedClassId, hasHydrated]);
  
  const { data: onDaysDocs, loading: onDaysLoading } = useCollection<any>(onDaysQuery);

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

  const sortedOnDayKeys = useMemo(() => {
    return Object.keys(classOnDays).sort();
  }, [classOnDays]);

  const daysInMonth = useMemo(() => {
    if (!currentDate) return [];
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate)
    });
  }, [currentDate]);

  const handleToggleAttendance = (dateKey: string, roll: number) => {
    if (!classOnDays[dateKey] || !user || !selectedClassId) return;

    const currentDayData = classAttendance[dateKey] || {};
    const isCurrentlyPresent = !!currentDayData[roll];
    const willBePresent = !isCurrentlyPresent;

    // Vibrate ONLY if student missed the previous "on day" and is now present
    if (willBePresent && vibrationEnabled && typeof window !== 'undefined' && window.navigator.vibrate) {
      const currentIndex = sortedOnDayKeys.indexOf(dateKey);
      if (currentIndex > 0) {
        const prevOnDayKey = sortedOnDayKeys[currentIndex - 1];
        const wasAbsentOnPrev = !classAttendance[prevOnDayKey]?.[roll];
        if (wasAbsentOnPrev) {
          window.navigator.vibrate([150, 80, 150]);
        }
      }
    }

    const docId = `${selectedClassId}_${dateKey}`;
    const docRef = doc(db, 'users', user.uid, 'attendance', docId);
    
    updateDoc(docRef, {
      [`data.${roll}`]: willBePresent,
      classId: selectedClassId,
      dateKey: dateKey
    }).catch(async (err: any) => {
      if (err.code === 'not-found') {
        setDoc(docRef, {
          classId: selectedClassId,
          dateKey,
          data: { [roll]: willBePresent }
        }, { merge: true }).catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'write',
            requestResourceData: { [roll]: willBePresent }
          }));
        });
      }
    });
  };

  const handleToggleOnDay = (dateKey: string) => {
    if (!user || !selectedClassId) return;
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

  const handleRenameClass = () => {
    if (classRef && editClassName.trim()) {
      updateDoc(classRef, { name: editClassName.trim() });
      setIsEditClassOpen(false);
    }
  };

  if (!hasHydrated || !currentDate) return null;

  if (!selectedClassId) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-muted-foreground bg-card/50 rounded-[3rem] border-2 border-dashed border-muted-foreground/10 font-headline italic text-xl gap-4">
        Select a class above to begin tracking
      </div>
    );
  }
  
  if (!user || classLoading || !selectedClass) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-muted-foreground animate-pulse font-headline italic text-2xl gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        Syncing Registry...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-6">
      <div className="bg-card border rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center lg:text-left">
          <h2 className="text-[10px] font-headline text-muted-foreground uppercase tracking-[0.3em]">Month View</h2>
          <MonthSelector currentDate={currentDate} onDateChange={setCurrentDate} />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" className="bg-background rounded-2xl h-12 px-6 text-sm border-muted-foreground/10" onClick={() => { setEditClassName(selectedClass.name); setIsEditClassOpen(true); }}>
            <Edit className="h-4 w-4 mr-2" /> Rename
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white rounded-2xl h-12 px-8 text-sm shadow-lg shadow-primary/20" onClick={() => setIsAddStudentOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Add Student
          </Button>
        </div>
      </div>

      <div className="rounded-[2.5rem] border bg-card shadow-xl overflow-hidden border-border/50 relative">
        <div className="overflow-x-auto max-h-[70vh] scrollbar-hide overscroll-none">
          <table className="w-full border-separate border-spacing-0 font-technical text-sm">
            <thead>
              <tr className="z-[60]">
                {/* Roll Column Header - STICKY */}
                <th className="sticky left-0 top-0 bg-card border-r border-b p-5 font-bold w-24 text-center text-lg z-[70] shadow-[2px_2px_5px_-2px_rgba(0,0,0,0.1)]">Roll</th>
                {/* Date Headers - STICKY TOP */}
                {daysInMonth.map(day => (
                  <th key={day.toISOString()} className="sticky top-0 p-4 border-r border-b min-w-[70px] text-center bg-card z-50">
                    <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-tighter">{format(day, 'EEE')}</div>
                    <div className="text-lg font-bold">{format(day, 'd')}</div>
                  </th>
                ))}
              </tr>
              <tr className="bg-muted/30">
                {/* Working Day Label - Sticky ONLY Left */}
                <th className="sticky left-0 bg-muted border-r border-b p-3 text-[10px] font-bold uppercase text-center text-primary/70 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Working</th>
                {/* Working Day Checkboxes - NO STICKY TOP */}
                {daysInMonth.map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const isOnDay = classOnDays[dateKey];
                  return (
                    <td key={day.toISOString()} className="p-3 border-r border-b text-center bg-muted/5">
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
                  {/* Student Roll - STICKY LEFT */}
                  <th className="sticky left-0 bg-card border-r border-b p-5 text-lg font-bold flex items-center justify-center gap-3 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <span className="text-primary">{student.roll}</span>
                    <button onClick={() => handleDeleteStudent(student.roll)} className="text-destructive/20 hover:text-destructive transition-all">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </th>
                  {/* Attendance Cells */}
                  {daysInMonth.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const isOnDay = classOnDays[dateKey];
                    const isPresent = classAttendance[dateKey]?.[student.roll];
                    return (
                      <td
                        key={day.toISOString()}
                        onClick={() => handleToggleAttendance(dateKey, student.roll)}
                        className={cn(
                          "p-0 border-r border-b min-w-[70px] h-16 transition-all cursor-pointer relative",
                          !isOnDay ? "bg-muted/10" : (isPresent ? "bg-status-present/10 hover:bg-status-present/20" : "bg-status-absent/10 hover:bg-status-absent/20")
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
            <tfoot className="sticky bottom-0 z-50">
              <tr className="bg-primary/5 border-t-2 border-primary/20 backdrop-blur-md">
                <th className="sticky left-0 bg-primary/10 border-r p-5 font-headline text-sm font-bold uppercase tracking-wider text-center text-primary z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Total Present</th>
                {daysInMonth.map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const isOnDay = classOnDays[dateKey];
                  const totalPresent = (selectedClass.students || []).filter((s: any) => classAttendance[dateKey]?.[s.roll]).length;
                  return (
                    <td key={day.toISOString()} className="p-4 border-r text-center font-bold text-xl text-primary bg-primary/5">
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
            <Input type="number" value={newRoll} onChange={(e) => setNewRoll(e.target.value)} placeholder="Roll Number" className="bg-muted border-none rounded-2xl h-16 text-3xl font-technical text-center" autoFocus />
          </div>
          <DialogFooter><Button onClick={handleAddStudent} className="w-full bg-primary rounded-2xl h-16 text-xl font-headline shadow-lg shadow-primary/20">Enroll</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditClassOpen} onOpenChange={setIsEditClassOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-8">
          <DialogHeader><DialogTitle className="font-headline text-3xl italic">Rename Class</DialogTitle></DialogHeader>
          <div className="py-6">
            <Input value={editClassName} onChange={(e) => setEditClassName(e.target.value)} placeholder="Class Name" className="bg-muted border-none rounded-2xl h-16 text-xl font-headline" autoFocus />
          </div>
          <DialogFooter><Button onClick={handleRenameClass} className="w-full bg-primary rounded-2xl h-16 text-xl font-headline shadow-lg shadow-primary/20">Update Name</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
