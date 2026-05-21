"use client"

import { AttendanceHeader } from '@/components/attendance/AttendanceHeader';
import { ClassSelector } from '@/components/attendance/ClassSelector';
import { Navbar } from '@/components/layout/Navbar';
import { MonthSelector } from '@/components/attendance/MonthSelector';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, parseISO } from 'date-fns';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Search, Download, FileText, Calendar as CalendarIcon, ArrowRight, UserCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { query, collection, where, doc } from 'firebase/firestore';

export default function HistoryPage() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const { selectedClassId, fineRate } = useStore();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));
  const [searchRoll, setSearchRoll] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Fetch Class Metadata
  const classRef = useMemo(() => {
    if (!user || !selectedClassId) return null;
    return doc(db, 'users', user.uid, 'classes', selectedClassId);
  }, [db, user, selectedClassId]);
  const { data: selectedClass } = useDoc<any>(classRef);

  // Fetch All Data for the class (we filter client-side for the range)
  const attendanceQuery = useMemo(() => {
    if (!user || !selectedClassId) return null;
    return query(collection(db, 'users', user.uid, 'attendance'), where('classId', '==', selectedClassId));
  }, [db, user, selectedClassId]);
  const { data: attendanceDocs } = useCollection<any>(attendanceQuery);

  const onDaysQuery = useMemo(() => {
    if (!user || !selectedClassId) return null;
    return query(collection(db, 'users', user.uid, 'onDays'), where('classId', '==', selectedClassId));
  }, [db, user, selectedClassId]);
  const { data: onDaysDocs } = useCollection<any>(onDaysQuery);

  const classAttendance = useMemo(() => {
    const map: any = {};
    attendanceDocs?.forEach(doc => { map[doc.dateKey] = doc.data; });
    return map;
  }, [attendanceDocs]);

  const classOnDays = useMemo(() => {
    const map: any = {};
    onDaysDocs?.forEach(doc => { map[doc.dateKey] = true; });
    return map;
  }, [onDaysDocs]);

  // View Calculation - Monthly Ledger
  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate)
    });
  }, [currentDate]);

  const totalOnDaysInMonth = useMemo(() => {
    return daysInMonth.filter(day => classOnDays[format(day, 'yyyy-MM-dd')]).length;
  }, [daysInMonth, classOnDays]);

  // View Calculation - Student Range View
  const rangeDays = useMemo(() => {
    try {
      return eachDayOfInterval({
        start: startOfMonth(startDate),
        end: endOfMonth(endDate)
      });
    } catch (e) {
      return [];
    }
  }, [startDate, endDate]);

  const studentInsight = useMemo(() => {
    if (!searchRoll || !selectedClass) return null;
    const roll = parseInt(searchRoll);
    if (isNaN(roll)) return null;

    const relevantDays = rangeDays.filter(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return classOnDays[dateKey];
    });

    const absences = relevantDays.filter(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return !classAttendance[dateKey]?.[roll];
    });

    return {
      roll,
      totalWorking: relevantDays.length,
      absentDays: absences.length,
      fine: absences.length * fineRate,
      history: relevantDays.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        return {
          date: day,
          status: !!classAttendance[dateKey]?.[roll]
        };
      }).sort((a, b) => b.date.getTime() - a.date.getTime())
    };
  }, [searchRoll, rangeDays, classOnDays, classAttendance, fineRate, selectedClass]);

  const reportData = useMemo(() => {
    if (!selectedClass) return [];
    return (selectedClass.students || []).map((student: any) => {
      const absentDays = daysInMonth.filter(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        return classOnDays[dateKey] && !classAttendance[dateKey]?.[student.roll];
      }).length;
      return {
        roll: student.roll,
        absentDays,
        totalFine: absentDays * fineRate
      };
    }).sort((a: any, b: any) => a.roll - b.roll);
  }, [selectedClass, daysInMonth, classOnDays, classAttendance, fineRate]);

  const downloadPDF = () => {
    if (!selectedClass) return;
    const doc = new jsPDF();
    const monthYear = format(currentDate, 'MMMM yyyy');
    
    doc.setFontSize(20);
    doc.text(`Monthly Attendance Report`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Class: ${selectedClass.name}`, 14, 30);
    doc.text(`Period: ${monthYear}`, 14, 37);
    doc.text(`Total Working Days: ${totalOnDaysInMonth}`, 14, 44);
    
    autoTable(doc, {
      head: [['Roll Number', 'Days Absent', 'Total Fine (BDT)']],
      body: reportData.map((d: any) => [d.roll, d.absentDays, d.totalFine]),
      startY: 55,
      styles: { font: 'helvetica' },
      headStyles: { fillColor: [0, 125, 138] }
    });
    
    doc.save(`Report_${selectedClass.name}_${format(currentDate, 'yyyy_MM')}.pdf`);
  };

  if (authLoading) return null;
  if (!user) return <div className="p-10 text-center font-headline">Please login to view history.</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="flex flex-col min-h-screen bg-background pb-24 md:pl-64">
        <div className="max-w-7xl mx-auto w-full px-4 md:px-12 py-8">
          <AttendanceHeader title="History" />
          
          <div className="space-y-8">
            <ClassSelector showAddButton={false} />

            {!selectedClass ? (
              <div className="text-center text-muted-foreground font-headline p-20 bg-card rounded-3xl border border-dashed">
                Select a class to access records
              </div>
            ) : (
              <div className="space-y-12">
                {/* Search & Insight Section */}
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-end gap-6 bg-card p-6 md:p-8 rounded-[2rem] border shadow-sm">
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-headline text-muted-foreground uppercase tracking-widest px-1">Deep Search (Roll)</label>
                      <div className="relative">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
                        <Input
                          type="number"
                          placeholder="Enter roll number for insight..."
                          value={searchRoll}
                          onChange={(e) => setSearchRoll(e.target.value)}
                          className="pl-14 bg-muted/50 rounded-2xl border-none h-16 font-technical text-2xl"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      <div className="space-y-2 w-full sm:w-auto">
                        <label className="text-xs font-headline text-muted-foreground uppercase tracking-widest text-center block">Start</label>
                        <MonthSelector currentDate={startDate} onDateChange={setStartDate} />
                      </div>
                      <ArrowRight className="hidden sm:block h-6 w-6 text-muted-foreground mt-8" />
                      <div className="space-y-2 w-full sm:w-auto">
                        <label className="text-xs font-headline text-muted-foreground uppercase tracking-widest text-center block">End</label>
                        <MonthSelector currentDate={endDate} onDateChange={setEndDate} />
                      </div>
                    </div>
                  </div>

                  {studentInsight ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-primary p-8 rounded-[2rem] text-primary-foreground shadow-xl">
                          <h3 className="font-headline text-lg italic opacity-80">Student</h3>
                          <p className="text-5xl font-technical font-bold">#{studentInsight.roll}</p>
                        </div>
                        <div className="bg-secondary p-8 rounded-[2rem] text-secondary-foreground shadow-lg">
                          <h3 className="font-headline text-lg italic opacity-80">Total Absent</h3>
                          <p className="text-5xl font-technical font-bold">{studentInsight.absentDays} <span className="text-2xl">Days</span></p>
                        </div>
                        <div className="bg-destructive p-8 rounded-[2rem] text-destructive-foreground shadow-lg">
                          <h3 className="font-headline text-lg italic opacity-80">Total Fine</h3>
                          <p className="text-5xl font-technical font-bold">{studentInsight.fine.toLocaleString()} <span className="text-2xl">BDT</span></p>
                        </div>
                      </div>

                      <div className="rounded-[2.5rem] border bg-card shadow-lg overflow-hidden">
                        <div className="p-8 border-b bg-muted/5 flex items-center gap-4">
                          <UserCircle className="h-8 w-8 text-primary" />
                          <h3 className="text-2xl font-headline italic">Attendance Log ({format(startDate, 'MMM yy')} - {format(endDate, 'MMM yy')})</h3>
                        </div>
                        <div className="max-h-[500px] overflow-auto">
                          <table className="w-full text-left font-technical text-lg">
                            <thead className="sticky top-0 bg-muted/10 backdrop-blur-md">
                              <tr className="border-b">
                                <th className="p-6">Date</th>
                                <th className="p-6">Status</th>
                                <th className="p-6 text-right">Fine</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentInsight.history.map((record, i) => (
                                <tr key={i} className={cn(
                                  "border-b last:border-0 hover:bg-muted/5 transition-colors",
                                  !record.status && "bg-status-absent/5"
                                )}>
                                  <td className="p-6 font-bold">{format(record.date, 'PPPP')}</td>
                                  <td className="p-6">
                                    <span className={cn(
                                      "px-4 py-1 rounded-full text-sm font-bold",
                                      record.status ? "bg-status-present/20 text-status-present" : "bg-status-absent/20 text-status-absent"
                                    )}>
                                      {record.status ? "PRESENT" : "ABSENT"}
                                    </span>
                                  </td>
                                  <td className="p-6 text-right font-bold text-destructive">
                                    {!record.status ? `${fineRate} BDT` : "-"}
                                  </td>
                                </tr>
                              ))}
                              {studentInsight.history.length === 0 && (
                                <tr>
                                  <td colSpan={3} className="p-20 text-center text-muted-foreground font-headline">No records found for this period</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : searchRoll ? (
                    <div className="p-10 text-center text-muted-foreground border-2 border-dashed rounded-3xl font-headline">
                      Enter a valid roll number to view history
                    </div>
                  ) : null}
                </div>

                {/* Monthly Ledger View (Only shown when not searching specific student or for general overview) */}
                <div className="space-y-6 pt-12 border-t border-dashed">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <h2 className="text-3xl font-headline text-foreground italic">Monthly Ledger</h2>
                      <p className="text-sm text-muted-foreground font-headline">Complete class overview for selected month</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-3xl border">
                      <MonthSelector currentDate={currentDate} onDateChange={setCurrentDate} />
                      <div className="h-10 w-px bg-border hidden sm:block" />
                      <span className="text-xs font-technical bg-primary/10 text-primary px-6 py-2 rounded-full font-bold">
                        {totalOnDaysInMonth} Working Days
                      </span>
                    </div>
                  </div>
                  
                  <div className="rounded-[2.5rem] border border-border overflow-hidden bg-card shadow-lg relative">
                    <div className="overflow-auto max-h-[600px]">
                      <table className="w-full border-separate border-spacing-0 font-technical text-sm">
                        <thead>
                          <tr>
                            <th className="sticky-column sticky top-0 z-50 bg-card p-6 border-r border-b min-w-[120px] text-xl font-bold">Roll</th>
                            {daysInMonth.map(day => (
                              <th key={day.toISOString()} className="sticky top-0 z-40 p-4 border-r border-b min-w-[60px] text-center bg-card">
                                <div className="text-[10px] text-muted-foreground uppercase">{format(day, 'EEE')}</div>
                                <div className="font-bold text-lg">{format(day, 'd')}</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedClass.students || []).map((student: any) => (
                            <tr key={student.roll} className="hover:bg-muted/5 transition-colors">
                              <th className="sticky-column bg-card p-6 border-r border-b font-bold text-xl">{student.roll}</th>
                              {daysInMonth.map(day => {
                                const dateKey = format(day, 'yyyy-MM-dd');
                                const isOnDay = classOnDays[dateKey];
                                const isPresent = classAttendance[dateKey]?.[student.roll];
                                return (
                                  <td 
                                    key={day.toISOString()} 
                                    className={cn(
                                      "p-0 border-r border-b min-w-[60px] h-16 text-center transition-colors",
                                      !isOnDay ? "on-day-off" : (isPresent ? "bg-status-present/20 text-status-present" : "bg-status-absent/20 text-status-absent")
                                    )}
                                  >
                                    {isOnDay && (isPresent ? <Check className="h-6 w-6 mx-auto" /> : "A")}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="sticky bottom-0 z-40">
                          <tr className="bg-primary/5 border-t-2 border-primary/20 backdrop-blur-md">
                            <th className="sticky-column bg-primary/10 border-r p-6 font-headline text-sm font-bold uppercase tracking-wider text-center text-primary">Total Attend</th>
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

                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-white rounded-[2rem] py-10 text-2xl sm:text-3xl font-headline flex gap-4 shadow-xl shadow-primary/20 transition-transform active:scale-95 h-auto group overflow-hidden"
                    onClick={() => setIsReportOpen(true)}
                  >
                    <FileText className="h-8 w-8 group-hover:scale-110 transition-transform" />
                    <span>Generate {format(currentDate, 'MMMM')} Report</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-[2.5rem] border-none shadow-2xl">
          <DialogHeader className="p-6 md:p-10 border-b bg-muted/5">
            <DialogTitle className="text-3xl md:text-4xl font-headline italic">
              {format(currentDate, 'MMMM yyyy')} Summary
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-muted/2">
            <div className="bg-card rounded-3xl border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-base md:text-lg font-technical">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="p-4 md:p-6 text-left font-bold">Roll Number</th>
                      <th className="p-4 md:p-6 text-center font-bold">Absences</th>
                      <th className="p-4 md:p-6 text-right font-bold">Fine (BDT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((item: any) => (
                      <tr key={item.roll} className="border-b last:border-0 hover:bg-muted/5 transition-colors">
                        <td className="p-4 md:p-6 font-bold text-xl md:text-2xl">{item.roll}</td>
                        <td className="p-4 md:p-6 text-center text-xl md:text-2xl">{item.absentDays}</td>
                        <td className="p-4 md:p-6 text-right font-bold text-2xl md:text-3xl text-status-absent">
                          {item.totalFine.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <DialogFooter className="p-6 md:p-10 border-t bg-card">
            <Button onClick={downloadPDF} className="w-full bg-primary hover:bg-primary/90 rounded-2xl py-6 md:py-8 flex gap-3 h-auto text-xl md:text-2xl font-headline shadow-lg shadow-primary/20">
              <Download className="h-6 w-6 md:h-8 md:w-8" />
              Download PDF Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}