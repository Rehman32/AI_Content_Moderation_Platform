import { LayoutDashboard, FileText, Settings, ShieldAlert, Users, Activity } from 'lucide-react';
import { Role } from '../types';

export interface NavItem {
  title: string;
  href: string;
  icon: any;
  roles: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    roles: ['ADMIN'],
  },
  {
    title: 'Submissions',
    href: '/submissions',
    icon: FileText,
    roles: ['USER', 'ADMIN'],
  },
  {
    title: 'Verdicts & Appeals',
    href: '/appeals',
    icon: ShieldAlert,
    roles: ['USER', 'ADMIN'], // Users see their own, admins see queue
  },
  {
    title: 'Policies',
    href: '/admin/policies',
    icon: Activity,
    roles: ['ADMIN'],
  },
  {
    title: 'Audit Logs',
    href: '/admin/audit',
    icon: Users, // Using Users as placeholder for audit
    roles: ['ADMIN'],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['USER', 'ADMIN'],
  },
];
