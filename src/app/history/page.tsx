
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

  const classAttendance = selectedClass ? attendance[selectedClass.id] || {} : {};
  const classOnDays = selectedClass ? onDays[selectedClass.id] || {} : {};

  const totalOnDays = useMemo(() => {
    return daysInMonth.filter(day => classOnDays[format(day, 'yyyy-MM-dd')]).length;
  }, [daysInMonth, classOnDays]);

  const reportData = useMemo(() => {
    if (!selectedClass) return [];
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
    if (!selectedClass) return;
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

  if (!selectedClass) {
    return (
      <main className="flex flex-col h-screen bg-background">
        <AttendanceHeader title="History" />
        <div className="flex-1 p-6 space-y-4">
          <ClassSelector showAddButton={false} />
          <div className="text-center text-muted-foreground font-headline p-10 bg-card rounded-2xl border">
            Please select a class to view records
          </div>
        </div>
        <Navbar />
      </main>
    );
  }

  return (
    <main className="flex flex-col h-screen overflow-hidden bg-background">
      <AttendanceHeader title="History" />
      
      <div className="flex-1 flex flex-col min-h-0 space-y-6 pb-20 overflow-y-auto">
        <ClassSelector showAddButton={false} />

        <div className="px-6 space-y-4">
          <button 
            onClick={() => {
              setNewFine(fineRate.toString());
              setIsFineModalOpen(true);
            }}
            className="w-full bg-secondary p-4 rounded-xl flex items-center justify-between text-secondary-foreground shadow-sm hover:brightness-95 transition-all"
          >
            <span className="font-headline text-xl font-bold italic">Fine:</span>
            <span className="text-2xl font-technical font-bold">{fineRate} BDT</span>
          </button>

          <div className="space-y-3">
            <h2 className="text-xs font-headline text-muted-foreground uppercase tracking-widest text-center">Select Period</h2>
            <MonthSelector currentDate={currentDate} onDateChange={setCurrentDate} />
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-headline text-muted-foreground uppercase tracking-widest">Filter by Roll</h2>
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
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-headline text-foreground">Monthly Ledger</h2>
              <span className="text-xs font-technical bg-primary/10 text-primary px-3 py-1 rounded-full">
                {totalOnDays} Working Days
              </span>
            </div>
            
            <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
              <div className="overflow-auto max-h-[350px]">
                <table className="w-full border-collapse font-technical text-sm">
                  <thead className="sticky top-0 z-20 bg-card border-b">
                    <tr>
                      <th className="sticky-column bg-card p-3 border-r min-w-[70px]">Roll</th>
                      {daysInMonth.map(day => (
                        <th key={day.toISOString()} className="p-2 border-r min-w-[40px] text-center text-[10px]">
                          {format(day, 'd')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedClass.students
                      .filter(s => !searchRoll || s.roll.toString().includes(searchRoll))
                      .map(student => (
                        <tr key={student.roll} className="hover:bg-muted/5 transition-colors">
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
                </table>
              </div>
            </div>
          </div>

          <Button 
            className="w-full bg-primary hover:bg-primary/90 text-white rounded-2xl py-8 text-xl font-headline flex gap-2 shadow-lg shadow-primary/20"
            onClick={() => setIsReportOpen(true)}
          >
            <FileText className="h-6 w-6" />
            Download {format(currentDate, 'MMMM')} Report
          </Button>
        </div>
      </div>

      {/* Fine Dialog */}
      <Dialog open={isFineModalOpen} onOpenChange={setIsFineModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl italic">Daily Fine Rate</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <Input
              type="number"
              value={newFine}
              onChange={(e) => setNewFine(e.target.value)}
              placeholder="Amount (BDT)"
              className="bg-muted border-none rounded-xl h-14 text-2xl text-center font-technical"
              autoFocus
            />
          </div>
          <DialogFooter className="flex-row gap-3">
            <Button variant="ghost" onClick={() => setIsFineModalOpen(false)} className="flex-1 rounded-xl h-12">Cancel</Button>
            <Button onClick={() => {
              setFineRate(parseInt(newFine) || 0);
              setIsFineModalOpen(false);
            }} className="flex-1 rounded-xl h-12 bg-primary">Save Rate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-hidden flex flex-col p-0 rounded-2xl">
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="text-2xl font-headline italic flex items-center justify-between">
              <span>{format(currentDate, 'MMMM yyyy')} Report</span>
              <Button variant="outline" size="icon" onClick={downloadPDF} className="text-primary border-primary rounded-full">
                <Download className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm font-technical">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-4 text-left">Roll</th>
                    <th className="p-4 text-center">Absences</th>
                    <th className="p-4 text-right">Fine (BDT)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReportData.map(item => (
                    <tr key={item.roll} className="border-b last:border-0 hover:bg-muted/5">
                      <td className="p-4 font-bold">{item.roll}</td>
                      <td className="p-4 text-center">{item.absentDays}</td>
                      <td className="p-4 text-right font-bold text-status-absent">{item.totalFine}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <DialogFooter className="p-6 border-t bg-card gap-3 flex-row">
            <Button onClick={downloadPDF} className="flex-1 bg-primary rounded-xl py-6 flex gap-2 h-auto text-lg font-headline">
              <Download className="h-5 w-5" />
              Export PDF
            </Button>
            <Button variant="ghost" onClick={() => setIsReportOpen(false)} className="flex-1 rounded-xl h-auto py-6 border">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Navbar />
    </main>
  );
}
