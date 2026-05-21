
"use client"

import { AttendanceHeader } from '@/components/attendance/AttendanceHeader';
import { Navbar } from '@/components/layout/Navbar';
import { useStore } from '@/lib/store';
import { Switch } from '@/components/ui/switch';
import { Cloud, LogIn, LogOut, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { useState } from 'react';

export default function SettingsPage() {
  const { vibrationEnabled, setVibrationEnabled, hydrateFromCloud, ...store } = useStore();
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const [syncing, setSyncing] = useState(false);

  const handleLogin = async () => {
    if (!auth) return;
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => auth && signOut(auth);

  const restoreFromCloud = async () => {
    if (!user || !db) return;
    setSyncing(true);
    try {
      // Load classes
      const classesSnap = await getDocs(collection(db, 'users', user.uid, 'classes'));
      const classes = classesSnap.docs.map(d => d.data());
      
      // Load other data
      const configSnap = await getDoc(doc(db, 'users', user.uid, 'config', 'data'));
      const config = configSnap.data();
      
      if (config) {
        hydrateFromCloud({
          classes: classes as any,
          attendance: config.attendance,
          onDays: config.onDays,
          fineRate: config.fineRate,
          vibrationEnabled: config.vibrationEnabled
        });
        alert("Restored all data from cloud!");
      } else if (classes.length > 0) {
        hydrateFromCloud({
          classes: classes as any
        });
        alert("Restored classes from cloud!");
      } else {
        alert("No cloud data found for this account.");
      }
    } catch (err) {
      console.error(err);
      alert("Restore failed.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <main className="flex flex-col h-screen">
      <AttendanceHeader title="Settings" />
      
      <div className="flex-1 p-6 space-y-8 overflow-y-auto pb-20">
        <section className="space-y-4">
          <h2 className="text-xl font-headline font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">Cloud Restore</h2>
          {!user ? (
            <div className="bg-card p-6 rounded-2xl border text-center space-y-4">
              <Cloud className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">Sign in to restore your attendance history on any device.</p>
              <Button onClick={handleLogin} className="w-full bg-primary flex gap-2">
                <LogIn className="h-4 w-4" />
                Sign in with Google
              </Button>
            </div>
          ) : (
            <div className="bg-card p-6 rounded-2xl border space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <RefreshCcw className={cn("h-5 w-5 text-primary", syncing && "animate-spin")} />
                </div>
                <div>
                  <h3 className="font-headline font-bold">Cloud Connected</h3>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              
              <Button 
                className="w-full bg-primary text-white" 
                onClick={restoreFromCloud} 
                disabled={syncing}
              >
                Restore Data from Cloud
              </Button>
              
              <Button variant="ghost" onClick={handleLogout} className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          )}
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
      </div>

      <Navbar />
    </main>
  );
}
