"use client"

import { AttendanceHeader } from '@/components/attendance/AttendanceHeader';
import { ClassSelector } from '@/components/attendance/ClassSelector';
import { Navbar } from '@/components/layout/Navbar';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Search, Check, Info } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { attendanceTrendSummary } from '@/ai/flows/attendance-trend-summary-flow';

export default function HistoryPage() {
  const { classes, selectedClassId, setSelectedClassId, fineRate, setFineRate, attendance, onDays } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchRoll, setSearchRoll] = useState('');
  const [isFineModalOpen, setIsFineModalOpen] = useState(false);
  const [newFine, setNewFine] = useState(fineRate.toString());
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{ summary: string; predictedDropOff?: boolean } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const selectedClass = classes.find(c => c.id === selectedClassId);

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate)
    });
  }, [currentDate]);

  if (!selectedClass) {
    return (
      <main className="flex flex-col h-screen">
        <AttendanceHeader title="History" />
        <div className="flex-1 p-6 text-center text-muted-foreground font-headline">Select a class to view history</div>
        <Navbar />
      </main>
    );
  }

  const classAttendance = attendance[selectedClass.id] || {};
  const classOnDays = onDays[selectedClass.id] || {};

  const totalOnDays = useMemo(() => {
    return daysInMonth.filter(day => classOnDays[format(day, 'yyyy-MM-dd')]).length;
  }, [daysInMonth, classOnDays]);

  const reportData = useMemo(() => {
    return selectedClass.students.map(student => {
      const absentDays = daysInMonth.filter(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        return classOnDays[dateKey] && !classAttendance[dateKey]?.[student.roll];
      }).length;
      return {
        roll: student.roll,
        absentDays,
        totalFine: absentDays * fineRate
      };
    }).sort((a, b) => a.roll - b.roll);
  }, [selectedClass, daysInMonth, classOnDays, classAttendance, fineRate]);

  const filteredReportData = searchRoll 
    ? reportData.filter(d => d.roll.toString().includes(searchRoll))
    : reportData;

  const handleRunAI = async () => {
    setIsAnalyzing(true);
    try {
      const result = await attendanceTrendSummary({
        classId: selectedClass.id,
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
        studentRoll: searchRoll ? parseInt(searchRoll) : undefined
      });
      setAiAnalysis(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="flex flex-col h-screen overflow-hidden">
      <AttendanceHeader title="History" />
      
      <div className="flex-1 flex flex-col min-h-0 space-y-6 pb-20 overflow-y-auto">
        <ClassSelector showAddButton={false} />

        <div className="px-6 space-y-4">
          {/* Fine Banner */}
          <button 
            onClick={() => setIsFineModalOpen(true)}
            className="w-full bg-secondary p-4 rounded-xl flex items-center justify-between text-secondary-foreground shadow-sm hover:brightness-95 transition-all"
          >
            <span className="font-headline text-xl font-bold italic">Fine:</span>
            <span className="text-2xl font-technical font-bold">{fineRate} BDT</span>
          </button>

          {/* Date Selector */}
          <div className="space-y-4">
            <h2 className="text-lg font-headline text-muted-foreground uppercase tracking-wider text-center">Select Month</h2>
            <div className="flex items-center justify-between bg-card p-2 rounded-xl border">
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="text-primary">
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <span className="text-xl font-headline font-bold">{format(currentDate, 'MMMM yyyy')}</span>
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="text-primary">
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="space-y-2">
            <h2 className="text-sm font-headline text-muted-foreground uppercase tracking-wider">Search by Roll</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Enter roll number to search"
                value={searchRoll}
                onChange={(e) => setSearchRoll(e.target.value)}
                className="pl-10 bg-card rounded-xl border-border h-12 font-technical"
              />
            </div>
          </div>

          {/* History View (Table) */}
          <div className="space-y-4">
            <h2 className="text-lg font-headline text-foreground">Attendance - {format(currentDate, 'yyyy-MM')}</h2>
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              <div className="overflow-auto max-h-[400px]">
                <table className="w-full border-collapse font-technical text-sm">
                  <thead className="sticky top-0 z-20 bg-card border-b">
                    <tr>
                      <th className="sticky-column bg-card p-3 border-r min-w-[70px]">Roll</th>
                      {daysInMonth.map(day => (
                        <th key={day.toISOString()} className="p-3 border-r min-w-[40px] text-center">
                          {format(day, 'd')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedClass.students
                      .filter(s => !searchRoll || s.roll.toString().includes(searchRoll))
                      .map(student => (
                        <tr key={student.roll}>
                          <th className="sticky-column bg-card p-3 border-r border-b font-bold">{student.roll}</th>
                          {daysInMonth.map(day => {
                            const dateKey = format(day, 'yyyy-MM-dd');
                            const isOnDay = classOnDays[dateKey];
                            const isPresent = classAttendance[dateKey]?.[student.roll];
                            return (
                              <td 
                                key={day.toISOString()} 
                                className={cn(
                                  "p-0 border-r border-b min-w-[40px] h-10 text-center",
                                  !isOnDay ? "on-day-off" : (isPresent ? "bg-status-present text-white" : "bg-status-absent text-white")
                                )}
                              >
                                {isOnDay && isPresent && <Check className="h-4 w-4 mx-auto" />}
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
                          <td key={day.toISOString()} className="p-3 border-r border-b text-center text-sm">
                            {presentCount}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div className="text-muted-foreground font-headline font-bold text-lg">Total On Day: {totalOnDays}</div>
          </div>

          {/* Report Button */}
          <Button 
            className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl py-7 text-xl font-headline"
            onClick={() => setIsReportOpen(true)}
          >
            {format(currentDate, 'MMMM yyyy')} Report
          </Button>

          {/* AI Intelligence Tool */}
          <div className="bg-card p-6 rounded-2xl border border-primary/20 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Info className="h-5 w-5" />
              <h3 className="font-headline text-lg font-bold">Attendance Intelligence</h3>
            </div>
            {aiAnalysis ? (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">{aiAnalysis.summary}</p>
                {aiAnalysis.predictedDropOff && (
                  <div className="p-2 bg-destructive/10 text-destructive text-xs rounded-md font-bold">
                    ⚠️ Potential attendance drop-off detected.
                  </div>
                )}
                <Button variant="ghost" size="sm" onClick={() => setAiAnalysis(null)} className="text-xs">Reset Analysis</Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full border-primary text-primary hover:bg-primary/10"
                onClick={handleRunAI}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? "Analyzing Patterns..." : "Run AI Trend Analysis"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isFineModalOpen} onOpenChange={setIsFineModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Daily Fine Amount</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="number"
              value={newFine}
              onChange={(e) => setNewFine(e.target.value)}
              placeholder="Enter amount (BDT)"
              className="bg-muted border-none"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsFineModalOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              setFineRate(parseInt(newFine) || 0);
              setIsFineModalOpen(false);
            }}>Set Fine</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline italic">Monthly Report - {format(currentDate, 'MMMM yyyy')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <table className="w-full text-sm font-technical">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-3 text-left">Roll</th>
                  <th className="p-3 text-center">Absent Days</th>
                  <th className="p-3 text-right">Fine (BDT)</th>
                </tr>
              </thead>
              <tbody>
                {filteredReportData.map(item => (
                  <tr key={item.roll} className="border-b last:border-0">
                    <td className="p-3 font-bold">{item.roll}</td>
                    <td className="p-3 text-center">{item.absentDays}</td>
                    <td className="p-3 text-right font-bold text-status-absent">{item.totalFine}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsReportOpen(false)} className="w-full">Close Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Navbar />
    </main>
  );
}
