
"use client"

import { AttendanceHeader } from '@/components/attendance/AttendanceHeader';
import { Navbar } from '@/components/layout/Navbar';
import { useStore } from '@/lib/store';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Download, Upload, ShieldCheck, LogIn, LogOut, User } from 'lucide-react';
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
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    try {
      await signInWithPopup(auth, provider);
      toast({
        title: "Signed In",
        description: "Successfully signed in with Google.",
      });
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') return;
      
      let errorMessage = error.message;
      if (error.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        errorMessage = `This domain (${domain}) is not authorized for Google Sign-In. Please add it to the 'Authorized domains' list in your Firebase Console (Authentication > Settings).`;
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = "Google Sign-In is not enabled. Please enable it in the Firebase Console under Authentication > Sign-in method.";
      }
      
      console.error('Sign in error:', error);
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: errorMessage,
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Signed Out",
        description: "You have been signed out.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign Out Failed",
        description: error.message,
      });
    }
  };

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
      description: "Attendance history saved to your device.",
    });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        try {
          importData(content);
          toast({
            title: "Restore Successful",
            description: "Attendance history has been updated.",
          });
        } catch (err) {
          toast({
            variant: "destructive",
            title: "Restore Failed",
            description: "Invalid backup file.",
          });
        }
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <main className="flex flex-col h-screen">
      <AttendanceHeader title="Settings" />
      
      <div className="flex-1 p-6 space-y-8 overflow-y-auto pb-20">
        <section className="space-y-6">
          <h2 className="text-xl font-headline font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">Account</h2>
          <div className="bg-card p-6 rounded-2xl border shadow-sm">
            {loading ? (
              <div className="animate-pulse flex items-center gap-4">
                <div className="h-12 w-12 bg-muted rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-muted rounded"></div>
                  <div className="h-3 w-24 bg-muted rounded"></div>
                </div>
              </div>
            ) : user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || 'User'} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold font-headline">{user.displayName || 'User'}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-destructive">
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Sign in with Google to enable sync and cloud features.</p>
                <Button onClick={handleGoogleSignIn} className="w-full flex gap-2 rounded-xl py-6 bg-[#4285F4] hover:bg-[#4285F4]/90 text-white border-none">
                  <LogIn className="h-5 w-5" />
                  Sign up with Google
                </Button>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-xl font-headline font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">Local Storage (Android Backup)</h2>
          
          <div className="bg-card p-6 rounded-2xl border space-y-4 shadow-sm">
            <div className="flex items-center gap-3 text-primary mb-2">
              <ShieldCheck className="h-6 w-6 shrink-0" />
              <p className="text-sm font-medium">Your data is stored on this device. Use these options to backup your records to a file or restore them after a reset.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                onClick={handleExport}
                className="flex flex-col h-auto py-4 gap-2 rounded-xl border-dashed"
              >
                <Download className="h-5 w-5" />
                <span>Backup to File</span>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col h-auto py-4 gap-2 rounded-xl border-dashed"
              >
                <Upload className="h-5 w-5" />
                <span>Restore from File</span>
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
              AttendSync Pro. 
              Designed for performance and reliability. Your data is backed up locally and ready for cloud sync.
            </p>
          </div>
        </section>
      </div>

      <Navbar />
    </main>
  );
}
