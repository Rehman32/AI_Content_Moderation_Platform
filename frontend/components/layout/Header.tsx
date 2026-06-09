'use client';

import { useTheme } from 'next-themes';
import { useAuth } from '../../features/auth/context/AuthContext';
import { LogOut, Moon, Sun, ShieldCheck } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-background/95 px-4 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2 md:hidden">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <span className="font-bold tracking-tight">AI Mod</span>
      </div>
      
      <div className="hidden md:flex" /> {/* Spacer for desktop where sidebar holds logo */}

      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-transparent hover:bg-accent hover:text-accent-foreground"
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>

        {/* User Dropdown / Info (Simplified for Phase 1) */}
        <div className="flex items-center gap-3 pl-4 border-l">
          <div className="hidden flex-col items-end text-sm md:flex">
            <span className="font-medium">{user?.firstName} {user?.lastName}</span>
            <span className="text-xs text-muted-foreground capitalize">{user?.role.toLowerCase()}</span>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
          <button
            onClick={logout}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ml-1"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
