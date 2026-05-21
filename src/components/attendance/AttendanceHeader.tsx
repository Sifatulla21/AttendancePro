
"use client"

import { Sun, Moon, User, LogOut } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useEffect } from 'react';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function AttendanceHeader({ title }: { title: string }) {
  const { theme, toggleTheme } = useStore();
  const { user } = useUser();
  const auth = useAuth();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleSignOut = () => signOut(auth);

  return (
    <div className="flex items-center justify-between py-8">
      <h1 className="text-5xl font-headline font-bold text-foreground italic">{title}</h1>
      
      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-2xl hover:bg-accent transition-all hover:scale-110 active:scale-95 bg-card border shadow-sm"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-6 w-6 text-secondary" />
          ) : (
            <Moon className="h-6 w-6 text-foreground" />
          )}
        </button>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-md hover:scale-105 transition-transform">
                <AvatarImage src={user.photoURL || ''} />
                <AvatarFallback className="bg-primary text-white">
                  <User className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl mt-2">
              <DropdownMenuLabel className="font-headline text-lg">
                <div className="flex flex-col">
                  <span>{user.displayName}</span>
                  <span className="text-[10px] text-muted-foreground font-technical uppercase truncate">{user.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive gap-2 font-bold py-3">
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
