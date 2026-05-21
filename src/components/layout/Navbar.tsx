
"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Home', icon: Home, href: '/' },
    { label: 'History', icon: History, href: '/history' },
    { label: 'Settings', icon: Settings, href: '/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-card/80 backdrop-blur-lg border-t flex items-center justify-center z-50">
      <div className="w-full max-w-6xl flex items-center justify-around px-4 h-full">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center space-y-1.5 w-full h-full transition-all duration-300 relative",
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary/70"
              )}
            >
              <div className={cn(
                "p-2 rounded-2xl transition-all duration-300",
                isActive ? "bg-primary/10 scale-110" : "bg-transparent"
              )}>
                <item.icon className={cn("h-7 w-7", isActive && "stroke-[2.5px]")} />
              </div>
              <span className={cn(
                "text-[11px] font-bold uppercase tracking-wider transition-all",
                isActive ? "opacity-100 translate-y-0" : "opacity-60 translate-y-0.5"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(0,125,138,0.5)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
