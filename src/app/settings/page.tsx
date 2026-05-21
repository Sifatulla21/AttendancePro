"use client"

import { AttendanceHeader } from '@/components/attendance/AttendanceHeader';
import { Navbar } from '@/components/layout/Navbar';
import { useStore } from '@/lib/store';
import { Switch } from '@/components/ui/switch';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { vibrationEnabled, setVibrationEnabled } = useStore();

  return (
    <main className="flex flex-col h-screen">
      <AttendanceHeader title="Settings" />
      
      <div className="flex-1 p-6 space-y-8">
        <section className="space-y-6">
          <h2 className="text-xl font-headline font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">Attendance Feedback</h2>
          
          <div className="flex items-center justify-between bg-card p-6 rounded-2xl shadow-sm border">
            <div className="space-y-1">
              <h3 className="text-lg font-headline font-bold">Vibration</h3>
              <p className="text-sm text-muted-foreground">Vibrate device when marking attendance</p>
            </div>
            <Switch
              checked={vibrationEnabled}
              onCheckedChange={setVibrationEnabled}
              className={cn(vibrationEnabled ? "bg-primary" : "bg-muted")}
            />
          </div>

          <div className="bg-card/50 p-6 rounded-2xl border border-dashed border-primary/30 space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Info className="h-6 w-6" />
              <h3 className="text-lg font-headline font-bold">Feedback Settings</h3>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Enable or disable notification sounds and vibration feedback when marking student attendance. 
              These settings apply to all attendance marking actions throughout the application.
            </p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl flex items-center justify-between">
            <span className="text-sm font-headline font-bold uppercase">Current Status</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-headline font-bold uppercase text-muted-foreground">Vibration:</span>
              <span className={cn(
                "text-sm font-technical font-bold px-3 py-1 rounded-full",
                vibrationEnabled ? "bg-status-present/20 text-status-present" : "bg-muted text-muted-foreground"
              )}>
                {vibrationEnabled ? "ON" : "OFF"}
              </span>
            </div>
          </div>
        </section>
      </div>

      <Navbar />
    </main>
  );
}
