"use client"

import { AttendanceHeader } from '@/components/attendance/AttendanceHeader';
import { ClassSelector } from '@/components/attendance/ClassSelector';
import { AttendanceGrid } from '@/components/attendance/AttendanceGrid';
import { Navbar } from '@/components/layout/Navbar';
import { useStore } from '@/lib/store';

export default function Home() {
  return (
    <main className="flex flex-col h-screen overflow-hidden">
      <AttendanceHeader title="Attendance" />
      <div className="flex-1 flex flex-col min-h-0 space-y-6">
        <ClassSelector />
        <AttendanceGrid />
      </div>
      <Navbar />
    </main>
  );
}
