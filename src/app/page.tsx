
"use client"

import { AttendanceHeader } from '@/components/attendance/AttendanceHeader';
import { ClassSelector } from '@/components/attendance/ClassSelector';
import { AttendanceGrid } from '@/components/attendance/AttendanceGrid';
import { Navbar } from '@/components/layout/Navbar';

export default function Home() {
  return (
    <main className="flex flex-col h-screen overflow-hidden bg-background">
      <AttendanceHeader title="Attendance" />
      <div className="flex-1 flex flex-col min-h-0 space-y-4 pb-16 overflow-hidden">
        <ClassSelector />
        <AttendanceGrid />
      </div>
      <Navbar />
    </main>
  );
}
