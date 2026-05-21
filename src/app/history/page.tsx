
"use client"

import { AttendanceHeader } from '@/components/attendance/AttendanceHeader';
import { ClassSelector } from '@/components/attendance/ClassSelector';
import { Navbar } from '@/components/layout/Navbar';
import { MonthSelector } from '@/components/attendance/MonthSelector';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Download, 
  ArrowRight, 
  Users, 
  Calendar as CalendarIcon,
  TrendingUp,
  AlertCircle,
  Loader2
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { query, collection, where, doc } from 'firebase/firestore';

export default function HistoryPage() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const { selectedClassId, fineRate, hasHydrated } = useStore();
  
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [searchRoll, setSearchRoll] = useState('');

  useEffect(() => {
    setStartDate(startOfMonth(new Date()));
    setEndDate(endOfMonth(new Date()));
  }, []);

  const classRef = useMemo(() => {
    if (!user || !selectedClassId || !hasHydrated) return null;
    return doc(db, 'users', user.uid, 'classes', selectedClassId);
  }, [db, user, selectedClassId, hasHydrated]);
  const { data: selectedClass, loading: classLoading } = useDoc<any>(classRef);

  const attendanceQuery = useMemo(() => {
    if (!user || !selectedClassId || !hasHydrated) return null;
    return query(collection(db, 'users', user.uid, 'attendance'), where('classId', '==', selectedClassId));
  }, [db, user, selectedClassId, hasHydrated]);
  const { data: attendanceDocs, loading: attendanceLoading } = useCollection<any>(attendanceQuery);

  const onDaysQuery = useMemo(() => {
    if (!user || !selectedClassId || !hasHydrated) return null;
    return query(collection(db, 'users', user.uid, 'onDays'), where('classId', '==', selectedClassId));
  }, [db, user, selectedClassId, hasHydrated]);
  const { data: onDaysDocs, loading: onDaysLoading } = useCollection<any>(onDaysQuery);

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

  const rangeDays = useMemo(() => {
    if (!startDate || !endDate) return [];
    try {
      return eachDayOfInterval({ start: startOfMonth(startDate), end: endOfMonth(endDate) });
    } catch (e) { return []; }
  }, [startDate, endDate]);

  const rangeOnDays = useMemo(() => {
    return rangeDays.filter(day => classOnDays[format(day, 'yyyy-MM-dd')]);
  }, [rangeDays, classOnDays]);

  const rangeReportData = useMemo(() => {
    if (!selectedClass) return [];
    return (selectedClass.students || []).map((student: any) => {
      const absences = rangeOnDays.filter(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        return !classAttendance[dateKey]?.[student.roll];
      }).length;
      return { roll: student.roll, absentDays: absences, totalFine: absences * fineRate };
    }).sort((a: any, b: any) => a.roll - b.roll);
  }, [selectedClass, rangeOnDays, classAttendance, fineRate]);

  const studentInsight = useMemo(() => {
    if (!searchRoll || !selectedClass || !startDate || !endDate) return null;
    const roll = parseInt(searchRoll);
    if (isNaN(roll)) return null;

    const absences = rangeOnDays.filter(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return !classAttendance[dateKey]?.[roll];
    });

    return {
      roll,
      totalWorking: rangeOnDays.length,
      absentDays: absences.length,
      fine: absences.length * fineRate,
      history: rangeOnDays.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        return { date: day, status: !!classAttendance[dateKey]?.[roll] };
      }).sort((a, b) => b.date.getTime() - a.date.getTime())
    };
  }, [searchRoll, rangeOnDays, classAttendance, fineRate, selectedClass, startDate, endDate]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Dismiss keyboard on mobile
      (e.target as HTMLInputElement).blur();
    }
  };

  const downloadPDF = () => {
    if (!selectedClass || !startDate || !endDate) return;
    const doc = new jsPDF();
    const period = `${format(startDate, 'MMM yyyy')} - ${format(endDate, 'MMM yyyy')}`;
    doc.setFontSize(22);
    doc.setTextColor(0, 125, 138); 
    doc.text(`Academic Attendance Summary`, 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Class: ${selectedClass.name}`, 14, 32);
    doc.text(`Range: ${period}`, 14, 39);
    doc.text(`Total Working Days: ${rangeOnDays.length}`, 14, 46);
    autoTable(doc, {
      head: [['Roll Number', 'Days Absent', 'Total Fine (BDT)']],
      body: rangeReportData.map((d: any) => [d.roll, d.absentDays, d.totalFine]),
      startY: 55,
      styles: { font: 'helvetica', fontSize: 10 },
      headStyles: { fillColor: [0, 125, 138], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    doc.save(`Summary_${selectedClass.name}_${format(startDate, 'yyyyMM')}.pdf`);
  };

  if (authLoading || !hasHydrated || !startDate || !endDate) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="font-headline italic text-muted-foreground">Fetching Records...</p>
      </div>
    );
  }

  if (!user) return <div className="p-10 text-center font-headline">Please login to view history.</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="flex flex-col min-h-screen bg-background pb-24 md:pl-64">
        <div className="max-w-7xl mx-auto w-full px-4 md:px-12 py-8" key={user.uid}>
          <AttendanceHeader title="History & Reports" />
          
          <div className="space-y-8">
            <ClassSelector showAddButton={false} />

            {!selectedClassId ? (
              <div className="text-center text-muted-foreground font-headline p-20 bg-card rounded-[3rem] border-2 border-dashed border-muted-foreground/10">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-2xl">Select a class to access records</p>
              </div>
            ) : classLoading || !selectedClass ? (
              <div className="text-center p-20 animate-pulse font-headline italic">Syncing with Registry...</div>
            ) : (
              <div className="space-y-10">
                <div className="bg-card p-6 md:p-10 rounded-[3rem] border shadow-xl space-y-8">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <h2 className="text-3xl font-headline font-bold text-foreground italic flex items-center gap-3">
                        <CalendarIcon className="h-8 w-8 text-primary" /> Range Selector
                      </h2>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/30 p-4 rounded-3xl border">
                      <MonthSelector currentDate={startDate} onDateChange={setStartDate} />
                      <ArrowRight className="hidden sm:block h-6 w-6 text-muted-foreground" />
                      <MonthSelector currentDate={endDate} onDateChange={setEndDate} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 text-center">
                      <span className="text-[10px] uppercase font-bold text-primary block mb-1">Period</span>
                      <p className="text-xl font-technical font-bold">{format(startDate, 'MMM yy')} - {format(endDate, 'MMM yy')}</p>
                    </div>
                    <div className="bg-primary p-6 rounded-2xl text-primary-foreground text-center shadow-lg">
                      <span className="text-[10px] uppercase font-bold opacity-80 block mb-1">Working Days</span>
                      <p className="text-3xl font-technical font-bold">{rangeOnDays.length}</p>
                    </div>
                    <Button onClick={downloadPDF} className="h-full bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-2xl font-headline text-xl shadow-lg transition-transform active:scale-95">
                      <Download className="h-6 w-6 mr-3" /> Download PDF
                    </Button>
                  </div>
                </div>

                <Tabs defaultValue="summary" className="space-y-6">
                  <TabsList className="bg-muted/50 p-1 rounded-2xl h-16 w-full lg:w-auto grid grid-cols-2 lg:flex gap-1 border">
                    <TabsTrigger value="summary" className="rounded-xl h-full font-headline text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <TrendingUp className="h-4 w-4 mr-2" /> Class Summary
                    </TabsTrigger>
                    <TabsTrigger value="individual" className="rounded-xl h-full font-headline text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Search className="h-4 w-4 mr-2" /> Student Insight
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary" className="space-y-6">
                    <div className="rounded-[2.5rem] border bg-card shadow-2xl overflow-hidden">
                      <div className="p-8 border-b bg-muted/5"><h3 className="text-2xl font-headline italic">Class Attendance Log</h3></div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left font-technical text-lg border-separate border-spacing-0">
                          <thead className="sticky top-0 bg-card z-20">
                            <tr className="border-b bg-muted/20">
                              <th className="p-6 border-b">Roll</th>
                              <th className="p-6 text-center border-b">Absences</th>
                              <th className="p-6 text-right border-b">Total Fine</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rangeReportData.map((item: any) => (
                              <tr key={item.roll} className="border-b last:border-0 hover:bg-muted/5 transition-colors">
                                <td className="p-6 font-bold text-2xl">#{item.roll}</td>
                                <td className="p-6 text-center text-xl">{item.absentDays} Days</td>
                                <td className="p-6 text-right font-bold text-2xl text-status-absent">{item.totalFine} BDT</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="sticky bottom-0 bg-primary/5 font-bold border-t-2 z-20">
                            <tr>
                              <td className="p-6">Average Absences</td>
                              <td className="p-6 text-center">
                                {rangeReportData.length > 0 
                                  ? (rangeReportData.reduce((acc, cur) => acc + cur.absentDays, 0) / rangeReportData.length).toFixed(1) 
                                  : 0} Days
                              </td>
                              <td className="p-6 text-right text-status-absent">
                                {rangeReportData.reduce((acc, cur) => acc + cur.totalFine, 0).toLocaleString()} BDT
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="individual" className="space-y-6">
                    <div className="bg-card p-6 md:p-8 rounded-[2.5rem] border shadow-lg space-y-6">
                      <div className="relative">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
                        <Input type="number" placeholder="Roll Number (e.g. 101)" value={searchRoll} onChange={(e) => setSearchRoll(e.target.value)} onKeyDown={handleSearchKeyDown} className="pl-14 bg-muted/30 rounded-2xl border-none h-16 font-technical text-2xl" />
                      </div>
                      {studentInsight ? (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-primary text-primary-foreground p-6 rounded-2xl shadow-md">
                              <span className="text-[10px] uppercase font-bold opacity-70 block">Student</span>
                              <p className="text-3xl font-technical font-bold">#{studentInsight.roll}</p>
                            </div>
                            <div className="bg-secondary text-secondary-foreground p-6 rounded-2xl shadow-md">
                              <span className="text-[10px] uppercase font-bold opacity-70 block">Absences</span>
                              <p className="text-3xl font-technical font-bold">{studentInsight.absentDays}</p>
                            </div>
                            <div className="bg-destructive text-destructive-foreground p-6 rounded-2xl shadow-md">
                              <span className="text-[10px] uppercase font-bold opacity-70 block">Fine (BDT)</span>
                              <p className="text-3xl font-technical font-bold">{studentInsight.fine}</p>
                            </div>
                            <div className="bg-muted/50 p-6 rounded-2xl border">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Rate</span>
                              <p className="text-3xl font-technical font-bold">{studentInsight.totalWorking > 0 ? Math.round(((studentInsight.totalWorking - studentInsight.absentDays) / studentInsight.totalWorking) * 100) : 0}%</p>
                            </div>
                          </div>
                          <div className="rounded-2xl border overflow-hidden max-h-[400px] overflow-y-auto scrollbar-hide">
                            <table className="w-full text-left font-technical border-separate border-spacing-0">
                              <thead className="sticky top-0 bg-card z-10">
                                <tr className="border-b">
                                  <th className="p-4 border-b">Date</th>
                                  <th className="p-4 border-b">Status</th>
                                  <th className="p-4 text-right border-b">Penalty</th>
                                </tr>
                              </thead>
                              <tbody>
                                {studentInsight.history.map((record, i) => (
                                  <tr key={i} className={cn("border-b last:border-0", !record.status && "bg-status-absent/5")}>
                                    <td className="p-4 font-bold">{format(record.date, 'eee, MMM do')}</td>
                                    <td className="p-4">
                                      <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold", record.status ? "bg-status-present/20 text-status-present" : "bg-status-absent/20 text-status-absent")}>
                                        {record.status ? "PRESENT" : "ABSENT"}
                                      </span>
                                    </td>
                                    <td className="p-4 text-right font-bold text-destructive">{!record.status ? `${fineRate} BDT` : "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed"><AlertCircle className="h-10 w-10 mx-auto mb-4 text-muted-foreground/30" /><p className="font-headline text-muted-foreground">Search by Roll for logs</p></div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
