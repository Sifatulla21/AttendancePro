
"use client"

import { AttendanceHeader } from '@/components/attendance/AttendanceHeader';
import { ClassSelector } from '@/components/attendance/ClassSelector';
import { Navbar } from '@/components/layout/Navbar';
import { MonthSelector } from '@/components/attendance/MonthSelector';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Search, Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function HistoryPage() {
  const { classes, selectedClassId, setSelectedClassId, fineRate, setFineRate, attendance, onDays } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchRoll, setSearchRoll] = useState('');
  const [isFineModalOpen, setIsFineModalOpen] = useState(false);
  const [newFine, setNewFine] = useState(fineRate.toString());
  const [isReportOpen, setIsReportOpen] = useState(false);

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

  const downloadPDF = () => {
    const doc = new jsPDF();
    const monthYear = format(currentDate, 'MMMM yyyy');
    
    doc.setFontSize(20);
    doc.text(`Monthly Attendance Report`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Class: ${selectedClass.name}`, 14, 30);
    doc.text(`Period: ${monthYear}`, 14, 37);
    doc.text(`Total Working Days: ${totalOnDays}`, 14, 44);
    
    autoTable(doc, {
      head: [['Roll Number', 'Days Absent', 'Total Fine (BDT)']],
      body: filteredReportData.map(d => [d.roll, d.absentDays, d.totalFine]),
      startY: 55,
      styles: { font: 'helvetica' },
      headStyles: { fillColor: [0, 125, 138] }
    });
    
    doc.save(`Attendance_Report_${selectedClass.name}_${format(currentDate, 'yyyy_MM')}.pdf`);
  };

  return (
    <main className="flex flex-col h-screen overflow-hidden">
      <AttendanceHeader title="History" />
      
      <div className="flex-1 flex flex-col min-h-0 space-y-6 pb-20 overflow-y-auto">
        <ClassSelector showAddButton={false} />

        <div className="px-6 space-y-4">
          <button 
            onClick={() => setIsFineModalOpen(true)}
            className="w-full bg-secondary p-4 rounded-xl flex items-center justify-between text-secondary-foreground shadow-sm hover:brightness-95 transition-all"
          >
            <span className="font-headline text-xl font-bold italic">Fine:</span>
            <span className="text-2xl font-technical font-bold">{fineRate} BDT</span>
          </button>

          <div className="space-y-4">
            <h2 className="text-lg font-headline text-muted-foreground uppercase tracking-wider text-center">Select Month</h2>
            <MonthSelector currentDate={currentDate} onDateChange={setCurrentDate} />
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-headline text-muted-foreground uppercase tracking-wider">Search by Roll</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Enter roll number"
                value={searchRoll}
                onChange={(e) => setSearchRoll(e.target.value)}
                className="pl-10 bg-card rounded-xl border-border h-12 font-technical"
              />
            </div>
          </div>

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
            <div className="text-muted-foreground font-headline font-bold text-lg">Total Working Days: {totalOnDays}</div>
          </div>

          <Button 
            className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl py-7 text-xl font-headline flex gap-2"
            onClick={() => setIsReportOpen(true)}
          >
            <FileText className="h-6 w-6" />
            {format(currentDate, 'MMMM yyyy')} Report
          </Button>
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
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-2xl font-headline italic">Monthly Report - {format(currentDate, 'MMMM yyyy')}</DialogTitle>
            <Button variant="outline" size="icon" onClick={downloadPDF} className="text-primary border-primary">
              <Download className="h-4 w-4" />
            </Button>
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
          <DialogFooter className="gap-2">
            <Button onClick={downloadPDF} className="flex-1 bg-primary rounded-xl py-6 flex gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button variant="ghost" onClick={() => setIsReportOpen(false)} className="flex-1 rounded-xl">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Navbar />
    </main>
  );
}
