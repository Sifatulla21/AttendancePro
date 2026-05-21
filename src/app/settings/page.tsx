
"use client"

import { AttendanceHeader } from '@/components/attendance/AttendanceHeader';
import { Navbar } from '@/components/layout/Navbar';
import { useStore } from '@/lib/store';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Download, Upload, ShieldCheck, LogIn, LogOut, User, Smartphone } from 'lucide-react';
import { useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

export default function SettingsPage() {
  const { vibrationEnabled, setVibrationEnabled, exportData, importData } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const auth = useAuth();
  const { user, loading } = useUser();

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
      toast({ title: "Welcome!", description: "Successfully signed in with Google." });
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') return;
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: error.message,
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({ title: "Signed Out", description: "You have been signed out." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sign Out Failed", description: error.message });
    }
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Backup Saved", description: "History exported to your device storage." });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        try {
          importData(content);
          toast({ title: "History Restored", description: "All records updated successfully." });
        } catch (err: any) {
          toast({ variant: "destructive", title: "Restore Failed", description: err.message });
        }
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <main className="flex flex-col h-screen bg-background">
      <AttendanceHeader title="Settings" />
      
      <div className="flex-1 p-6 space-y-8 overflow-y-auto pb-24">
        {/* Account Section */}
        <section className="space-y-4">
          <h2 className="text-xs font-headline font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">Account</h2>
          <div className="bg-card p-6 rounded-2xl border shadow-sm">
            {loading ? (
              <div className="animate-pulse flex items-center gap-4">
                <div className="h-12 w-12 bg-muted rounded-full"></div>
                <div className="space-y-2"><div className="h-4 w-32 bg-muted rounded"></div></div>
              </div>
            ) : user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold font-headline">{user.displayName || 'User'}</h3>
                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">{user.email}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-destructive hover:bg-destructive/10">
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground font-headline">Secure your data by linking your Google account.</p>
                <Button onClick={handleGoogleSignIn} className="w-full flex gap-3 rounded-xl py-6 bg-[#4285F4] hover:bg-[#4285F4]/90 text-white border-none shadow-md">
                  <LogIn className="h-5 w-5" />
                  Sign up with Google
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Local Backup Section (Android Focused) */}
        <section className="space-y-4">
          <h2 className="text-xs font-headline font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">Android Local Backup</h2>
          <div className="bg-card p-6 rounded-2xl border space-y-5 shadow-sm">
            <div className="flex items-start gap-3">
              <Smartphone className="h-6 w-6 text-primary shrink-0" />
              <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                Save your complete attendance history to your phone's storage. You can restore this file even after clearing your browser or reinstalling the app.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={handleExport} className="flex flex-col h-auto py-5 gap-2 rounded-xl border-dashed hover:bg-primary/5 transition-all">
                <Download className="h-6 w-6 text-primary" />
                <span className="text-xs font-bold">Export History</span>
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex flex-col h-auto py-5 gap-2 rounded-xl border-dashed hover:bg-primary/5 transition-all">
                <Upload className="h-6 w-6 text-primary" />
                <span className="text-xs font-bold">Restore History</span>
              </Button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json" />
          </div>
        </section>

        {/* Preferences */}
        <section className="space-y-4">
          <h2 className="text-xs font-headline font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">Preferences</h2>
          <div className="bg-card p-6 rounded-2xl shadow-sm border flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-headline font-bold">Haptic Feedback</h3>
              <p className="text-xs text-muted-foreground">Vibrate on attendance mark</p>
            </div>
            <Switch
              checked={vibrationEnabled}
              onCheckedChange={setVibrationEnabled}
              className={cn(vibrationEnabled ? "bg-primary" : "bg-muted")}
            />
          </div>
        </section>

        <section className="pt-4 opacity-50 text-center">
          <p className="text-[10px] font-technical uppercase tracking-widest">AttendSync Pro v2.0 • Web App Ready</p>
        </section>
      </div>

      <Navbar />
    </main>
  );
}
