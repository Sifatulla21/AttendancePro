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
import { useUser } from '@/firebase';

export default function HistoryPage() {
  const { user, loading: authLoading } = useUser();
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
                Please select a class to view records
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <button 
                    onClick={() => {
                      setNewFine(fineRate.toString());
                      setIsFineModalOpen(true);
                    }}
                    className="bg-secondary p-8 rounded-3xl flex items-center justify-between text-secondary-foreground shadow-sm hover:brightness-95 transition-all"
                  >
                    <span className="font-headline text-3xl font-bold italic">Fine Rate:</span>
                    <span className="text-4xl font-technical font-bold">{fineRate} BDT</span>
                  </button>

                  <div className="bg-card p-8 rounded-3xl border flex flex-col justify-center space-y-3 shadow-sm">
                    <h2 className="text-xs font-headline text-muted-foreground uppercase tracking-widest text-center">Select Period</h2>
                    <MonthSelector currentDate={currentDate} onDateChange={setCurrentDate} />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xs font-headline text-muted-foreground uppercase tracking-widest">Filter by Roll</h2>
                  <div className="relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="Search roll number..."
                      value={searchRoll}
                      onChange={(e) => setSearchRoll(e.target.value)}
                      className="pl-14 bg-card rounded-2xl border-border h-16 font-technical text-xl"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-headline text-foreground italic">Monthly Ledger</h2>
                    <span className="text-sm font-technical bg-primary/10 text-primary px-6 py-2 rounded-full font-bold">
                      {totalOnDays} Working Days
                    </span>
                  </div>
                  
                  <div className="rounded-3xl border border-border overflow-hidden bg-card shadow-lg">
                    <div className="overflow-auto max-h-[600px]">
                      <table className="w-full border-collapse font-technical text-sm">
                        <thead className="sticky top-0 z-20 bg-card border-b">
                          <tr>
                            <th className="sticky-column bg-card p-6 border-r min-w-[120px] text-xl">Roll</th>
                            {daysInMonth.map(day => (
                              <th key={day.toISOString()} className="p-4 border-r min-w-[60px] text-center">
                                <div className="text-[10px] text-muted-foreground">{format(day, 'EEE')}</div>
                                <div className="font-bold text-lg">{format(day, 'd')}</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedClass.students
                            .filter(s => !searchRoll || s.roll.toString().includes(searchRoll))
                            .map(student => (
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
                        <tfoot>
                          <tr className="bg-primary/5 border-t-2 border-primary/20">
                            <th className="sticky-column bg-primary/10 border-r p-6 font-headline text-sm font-bold uppercase tracking-wider text-center text-primary">Total Attend</th>
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
                </div>

                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-3xl py-10 text-3xl font-headline flex gap-4 shadow-xl shadow-primary/20 mb-10 transition-transform active:scale-95 h-auto"
                  onClick={() => setIsReportOpen(true)}
                >
                  <FileText className="h-8 w-8" />
                  Generate {format(currentDate, 'MMMM')} Report
                </Button>
              </>
            )}
          </div>
        </div>
      </main>

      <Dialog open={isFineModalOpen} onOpenChange={setIsFineModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="font-headline text-3xl italic">Daily Fine Rate</DialogTitle>
          </DialogHeader>
          <div className="py-8">
            <Input
              type="number"
              value={newFine}
              onChange={(e) => setNewFine(e.target.value)}
              placeholder="Amount (BDT)"
              className="bg-muted border-none rounded-2xl h-20 text-4xl text-center font-technical"
              autoFocus
            />
          </div>
          <DialogFooter className="flex-row gap-4">
            <Button variant="ghost" onClick={() => setIsFineModalOpen(false)} className="flex-1 rounded-2xl h-16 text-xl">Cancel</Button>
            <Button onClick={() => {
              setFineRate(parseInt(newFine) || 0);
              setIsFineModalOpen(false);
            }} className="flex-1 rounded-2xl h-16 bg-primary text-xl">Save Rate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    {filteredReportData.map(item => (
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
          
          <DialogFooter className="p-6 md:p-10 border-t bg-card gap-4 md:gap-6 flex-col md:flex-row">
            <Button onClick={downloadPDF} className="w-full md:flex-1 bg-primary hover:bg-primary/90 rounded-2xl py-6 md:py-8 flex gap-3 h-auto text-xl md:text-2xl font-headline shadow-lg shadow-primary/20">
              <Download className="h-6 w-6 md:h-8 md:w-8" />
              Download PDF Report
            </Button>
            <Button variant="outline" onClick={() => setIsReportOpen(false)} className="w-full md:flex-1 rounded-2xl h-auto py-6 md:py-8 text-xl md:text-2xl font-headline border-2">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
