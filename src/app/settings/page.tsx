
"use client"

import { AttendanceHeader } from '@/components/attendance/AttendanceHeader';
import { Navbar } from '@/components/layout/Navbar';
import { useStore } from '@/lib/store';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { vibrationEnabled, setVibrationEnabled } = useStore();

  return (
    <main className="flex flex-col h-screen">
      <AttendanceHeader title="Settings" />
      
      <div className="flex-1 p-6 space-y-8 overflow-y-auto pb-20">
        <section className="space-y-6">
          <h2 className="text-xl font-headline font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">Preferences</h2>
          
          <div className="flex items-center justify-between bg-card p-6 rounded-2xl shadow-sm border">
            <div className="space-y-1">
              <h3 className="text-lg font-headline font-bold">Vibration</h3>
              <p className="text-sm text-muted-foreground">Vibrate device on mark</p>
            </div>
            <Switch
              checked={vibrationEnabled}
              onCheckedChange={setVibrationEnabled}
              className={cn(vibrationEnabled ? "bg-primary" : "bg-muted")}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-headline font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">About</h2>
          <div className="bg-card p-6 rounded-2xl border">
            <p className="text-sm text-muted-foreground leading-relaxed">
              AttendSync Pro helps you manage student attendance with ease. 
              Track daily records, calculate fines, and generate monthly reports instantly.
            </p>
          </div>
        </section>
      </div>

      <Navbar />
    </main>
  );
}
