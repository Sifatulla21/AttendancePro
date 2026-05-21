
"use client"

import { AttendanceHeader } from '@/components/attendance/AttendanceHeader';
import { Navbar } from '@/components/layout/Navbar';
import { useStore } from '@/lib/store';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Download, Upload, ShieldCheck } from 'lucide-react';
import { useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { vibrationEnabled, setVibrationEnabled, exportData, importData } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attend-sync-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Backup Successful",
      description: "Attendance data saved to your device.",
    });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        importData(content);
        toast({
          title: "Restore Successful",
          description: "Attendance history has been updated.",
        });
      };
      reader.readAsText(file);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

        <section className="space-y-6">
          <h2 className="text-xl font-headline font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">Local Backup</h2>
          
          <div className="bg-card p-6 rounded-2xl border space-y-4">
            <div className="flex items-center gap-3 text-primary mb-2">
              <ShieldCheck className="h-6 w-6" />
              <p className="text-sm font-medium">Your data is stored only on this device. Use backup to save history before clearing browser cache.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                onClick={handleExport}
                className="flex flex-col h-auto py-4 gap-2 rounded-xl"
              >
                <Download className="h-5 w-5" />
                <span>Backup</span>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col h-auto py-4 gap-2 rounded-xl"
              >
                <Upload className="h-5 w-5" />
                <span>Restore</span>
              </Button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImport} 
              className="hidden" 
              accept=".json"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-headline font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">About</h2>
          <div className="bg-card p-6 rounded-2xl border">
            <p className="text-sm text-muted-foreground leading-relaxed">
              AttendSync Pro for Android. 
              Manage students, track fines, and keep your records safe with local file backups.
            </p>
          </div>
        </section>
      </div>

      <Navbar />
    </main>
  );
}
