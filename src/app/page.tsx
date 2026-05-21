
"use client"

import { useUser, useAuth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { AttendanceHeader } from '@/components/attendance/AttendanceHeader';
import { ClassSelector } from '@/components/attendance/ClassSelector';
import { AttendanceGrid } from '@/components/attendance/AttendanceGrid';
import { Navbar } from '@/components/layout/Navbar';
import { LogIn, ShieldCheck } from 'lucide-react';

export default function Home() {
  const { user, loading } = useUser();
  const auth = useAuth();

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-background px-6 text-center space-y-8">
        <div className="space-y-4">
          <div className="bg-primary/10 p-6 rounded-full inline-block">
            <ShieldCheck className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-5xl font-headline font-bold text-foreground">AttendSync Pro</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto font-headline italic">
            Secure, precise, and professional student attendance management for modern educators.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <Button 
            onClick={handleLogin}
            className="w-full py-8 text-xl font-headline bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-xl flex gap-3 transition-transform active:scale-95"
          >
            <LogIn className="h-6 w-6" />
            Sign in with Google
          </Button>
          <p className="text-xs text-muted-foreground font-technical uppercase tracking-widest">
            Authentication required to access records
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-screen bg-background pb-20">
      <div className="max-w-6xl mx-auto w-full px-4 md:px-8">
        <AttendanceHeader title="Attendance" />
        <div className="space-y-6">
          <ClassSelector />
          <AttendanceGrid />
        </div>
      </div>
      <Navbar />
    </main>
  );
}
