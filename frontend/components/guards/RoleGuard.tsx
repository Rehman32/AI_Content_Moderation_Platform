'use client';

import { ReactNode } from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { Role } from '../../types';

interface RoleGuardProps {
  allowedRoles: Role[];
  children: ReactNode;
  fallback?: ReactNode; // Optional component to show if unauthorized (defaults to null)
}

/**
 * Conditionally renders children if the authenticated user has one of the allowed roles.
 * Use this to hide admin-only buttons or sidebar items from standard users.
 */
export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const { user, isLoading } = useAuth();

  // If still loading, we shouldn't guess. 
  // Returning null prevents flickering of forbidden content.
  if (isLoading) {
    return null;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
