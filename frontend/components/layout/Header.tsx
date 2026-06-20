'use client';

import { useTheme } from 'next-themes';
import { useAuth } from '../../features/auth/context/AuthContext';
import { LogOut, Moon, Sun, ShieldCheck, User as UserIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { CommandMenu } from '../ui-custom/CommandMenu';

export function Header() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-background/95 px-4 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2 md:hidden">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <span className="font-bold tracking-tight">AI Mod</span>
      </div>
      
      <div className="hidden md:flex" />

      <div className="flex flex-1 items-center justify-end space-x-4">
        <div className="w-full flex-1 md:w-auto md:flex-none">
          <CommandMenu />
        </div>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-transparent hover:bg-accent hover:text-accent-foreground"
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>

        <div className="flex items-center gap-3 pl-4 border-l">
          <div className="hidden flex-col items-end text-sm md:flex">
            <span className="font-medium">{user?.firstName} {user?.lastName}</span>
            <span className="text-xs text-muted-foreground capitalize">{user?.role.toLowerCase()}</span>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-all cursor-pointer outline-none">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" disabled>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer hover:bg-destructive/10 hover:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
