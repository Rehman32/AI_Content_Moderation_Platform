'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { DialogProps } from '@radix-ui/react-dialog';
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  Search,
  Scale,
  ShieldCheck,
  FileText,
  Home,
  LogOut,
  LineChart,
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '../../components/ui/command';
import { useAuth } from '../../features/auth/context/AuthContext';

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input hover:bg-accent hover:text-accent-foreground px-4 py-2 relative h-9 w-full justify-start rounded-[0.5rem] bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
      >
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <span className="hidden lg:inline-flex">Search...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="General">
            <CommandItem
              onSelect={() => runCommand(() => router.push(user?.role === 'ADMIN' ? '/admin' : '/submissions'))}
            >
              <Home className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/settings'))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          {user?.role === 'ADMIN' && (
            <CommandGroup heading="Admin Tools">
              <CommandItem onSelect={() => runCommand(() => router.push('/admin/moderation'))}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                <span>Moderation Queue</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push('/admin/appeals'))}>
                <Scale className="mr-2 h-4 w-4" />
                <span>Appeals Queue</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push('/admin/analytics'))}>
                <LineChart className="mr-2 h-4 w-4" />
                <span>Advanced Analytics</span>
              </CommandItem>
            </CommandGroup>
          )}
          {user?.role === 'USER' && (
            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => runCommand(() => router.push('/submissions/create'))}>
                <FileText className="mr-2 h-4 w-4" />
                <span>New Submission</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push('/appeals'))}>
                <Scale className="mr-2 h-4 w-4" />
                <span>My Appeals</span>
              </CommandItem>
            </CommandGroup>
          )}
          <CommandSeparator />
          <CommandGroup heading="Account">
            <CommandItem onSelect={() => runCommand(() => logout())}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
