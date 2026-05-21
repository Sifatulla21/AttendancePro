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
  AlertCircle
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

  // Hydration safety
  useEffect(() => {
    setStartDate(startOfMonth(new Date()));
    setEndDate(endOfMonth(new Date()));
  }, []);

  // Fetch Class Metadata
  const classRef = useMemo(() => {
    if (!user || !selectedClassId) return null;
    return doc(db, 'users', user.uid, 'classes', selectedClassId);
  }, [db, user, selectedClassId]);
  const { data: selectedClass } = useDoc<any>(classRef);

  // Fetch All Attendance Data
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

  // Range Calculations
  const rangeDays = useMemo(() => {
    if (!startDate || !endDate) return [];
    try {
      return eachDayOfInterval({
        start: startOfMonth(startDate),
        end: endOfMonth(endDate)
      });
    } catch (e) {
      return [];
    }
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
      return {
        roll: student.roll,
        absentDays: absences,
        totalFine: absences * fineRate
      };
    }).sort((a: any, b: any) => a.roll - b.roll);
  }, [selectedClass, rangeOnDays, classAttendance, fineRate]);

  // Individual Insight
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
        return {
          date: day,
          status: !!classAttendance[dateKey]?.[roll]
        };
      }).sort((a, b) => b.date.getTime() - a.date.getTime())
    };
  }, [searchRoll, rangeOnDays, classAttendance, fineRate, selectedClass, startDate, endDate]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
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
      headStyles: { fillColor: [0, 125, 138], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 55 }
    });
    
    doc.save(`Summary_${selectedClass.name}_${format(startDate, 'yyyyMM')}_${format(endDate, 'yyyyMM')}.pdf`);
  };

  if (authLoading || !hasHydrated || !startDate || !endDate) return null;
  if (!user) return <div className="p-10 text-center font-headline">Please login to view history.</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="flex flex-col min-h-screen bg-background pb-24 md:pl-64">
        <div className="max-w-7xl mx-auto w-full px-4 md:px-12 py-8">
          <AttendanceHeader title="History & Reports" />
          
          <div className="space-y-8">
            <ClassSelector showAddButton={false} />

            {!selectedClassId ? (
              <div className="text-center text-muted-foreground font-headline p-20 bg-card rounded-[2.5rem] border-2 border-dashed border-muted-foreground/20">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-2xl">Select a class to access records</p>
              </div>
            ) : !selectedClass ? (
               <div className="text-center p-20 animate-pulse font-headline italic">Syncing Records...</div>
            ) : (
              <div className="space-y-10">
                {/* Global Range Selector */}
                <div className="bg-card p-6 md:p-10 rounded-[3rem] border shadow-xl space-y-8">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <h2 className="text-3xl font-headline font-bold text-foreground italic flex items-center gap-3">
                        <CalendarIcon className="h-8 w-8 text-primary" />
                        Reporting Range
                      </h2>
                      <p className="text-sm text-muted-foreground font-headline">Define the period for calculations and summaries</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/30 p-4 rounded-3xl border">
                      <div className="space-y-1 text-center">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">From</span>
                        <MonthSelector currentDate={startDate} onDateChange={setStartDate} />
                      </div>
                      <ArrowRight className="hidden sm:block h-6 w-6 text-muted-foreground mt-4" />
                      <div className="space-y-1 text-center">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">To</span>
                        <MonthSelector currentDate={endDate} onDateChange={setEndDate} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 text-center">
                      <span className="text-[10px] uppercase font-bold text-primary block mb-1">Period Duration</span>
                      <p className="text-xl font-technical font-bold">{format(startDate, 'MMM yyyy')} - {format(endDate, 'MMM yyyy')}</p>
                    </div>
                    <div className="bg-primary p-6 rounded-2xl text-primary-foreground text-center shadow-lg">
                      <span className="text-[10px] uppercase font-bold opacity-80 block mb-1">Total Working Days</span>
                      <p className="text-3xl font-technical font-bold">{rangeOnDays.length}</p>
                    </div>
                    <Button 
                      onClick={downloadPDF}
                      className="h-full bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-2xl font-headline text-xl flex gap-3 shadow-lg shadow-secondary/20 transition-transform active:scale-95"
                    >
                      <Download className="h-6 w-6" />
                      Download PDF Report
                    </Button>
                  </div>
                </div>

                <Tabs defaultValue="summary" className="space-y-6">
                  <TabsList className="bg-muted/50 p-1 rounded-2xl h-16 w-full lg:w-auto grid grid-cols-2 lg:flex gap-1 border">
                    <TabsTrigger value="summary" className="rounded-xl h-full font-headline text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Class Summary
                    </TabsTrigger>
                    <TabsTrigger value="individual" className="rounded-xl h-full font-headline text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Search className="h-4 w-4 mr-2" />
                      Student Insight
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="rounded-[2.5rem] border bg-card shadow-2xl overflow-hidden">
                      <div className="p-8 border-b flex items-center justify-between bg-muted/5">
                        <h3 className="text-2xl font-headline italic">Class-Wide Attendance Log</h3>
                        <div className="flex items-center gap-2 text-xs font-technical bg-primary/10 text-primary px-4 py-1.5 rounded-full">
                          <Users className="h-3.5 w-3.5" />
                          {selectedClass.students?.length || 0} Students
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left font-technical text-lg">
                          <thead>
                            <tr className="border-b bg-muted/20">
                              <th className="p-6">Roll Number</th>
                              <th className="p-6 text-center">Total Absences</th>
                              <th className="p-6 text-right">Accumulated Fine</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rangeReportData.map((item: any) => (
                              <tr key={item.roll} className="border-b last:border-0 hover:bg-muted/5 transition-colors">
                                <td className="p-6 font-bold text-2xl">#{item.roll}</td>
                                <td className="p-6 text-center text-xl">{item.absentDays} Days</td>
                                <td className="p-6 text-right font-bold text-2xl text-status-absent">
                                  {item.totalFine.toLocaleString()} <span className="text-sm font-normal text-muted-foreground ml-1">BDT</span>
                                </td>
                              </tr>
                            ))}
                            {rangeReportData.length === 0 && (
                              <tr>
                                <td colSpan={3} className="p-20 text-center text-muted-foreground font-headline italic">No student data available</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="individual" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-card p-6 md:p-8 rounded-[2.5rem] border shadow-lg space-y-6">
                      <div className="relative">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
                        <Input
                          type="number"
                          placeholder="Search individual roll (e.g. 101)"
                          value={searchRoll}
                          onChange={(e) => setSearchRoll(e.target.value)}
                          onKeyDown={handleSearchKeyDown}
                          className="pl-14 bg-muted/30 rounded-2xl border-none h-16 font-technical text-2xl focus:ring-primary/20"
                        />
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
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Attendance Rate</span>
                              <p className="text-3xl font-technical font-bold">
                                {studentInsight.totalWorking > 0 
                                  ? Math.round(((studentInsight.totalWorking - studentInsight.absentDays) / studentInsight.totalWorking) * 100)
                                  : 0}%
                              </p>
                            </div>
                          </div>

                          <div className="rounded-2xl border overflow-hidden">
                            <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                              <table className="w-full text-left font-technical">
                                <thead className="sticky top-0 bg-muted/80 backdrop-blur-md z-10">
                                  <tr className="border-b">
                                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Date</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">Daily Penalty</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {studentInsight.history.map((record, i) => (
                                    <tr key={i} className={cn(
                                      "border-b last:border-0 transition-colors",
                                      !record.status ? "bg-status-absent/5" : "hover:bg-muted/5"
                                    )}>
                                      <td className="p-4 font-bold">{format(record.date, 'eeee, MMMM do')}</td>
                                      <td className="p-4">
                                        <span className={cn(
                                          "px-3 py-1 rounded-full text-[10px] font-bold",
                                          record.status ? "bg-status-present/20 text-status-present" : "bg-status-absent/20 text-status-absent"
                                        )}>
                                          {record.status ? "PRESENT" : "ABSENT"}
                                        </span>
                                      </td>
                                      <td className="p-4 text-right font-bold text-destructive">
                                        {!record.status ? `${fineRate} BDT` : "-"}
                                      </td>
                                    </tr>
                                  ))}
                                  {studentInsight.history.length === 0 && (
                                    <tr>
                                      <td colSpan={3} className="p-10 text-center text-muted-foreground font-headline">No working days found in this range</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed">
                          <AlertCircle className="h-10 w-10 mx-auto mb-4 text-muted-foreground/30" />
                          <p className="font-headline text-muted-foreground">Search by Roll to see detailed logs</p>
                        </div>
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
