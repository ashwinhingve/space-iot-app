'use client';

import { ReactNode } from 'react';
import { useRole, UserRole, PagePermission } from '@/hooks/useRole';
import { Shield } from 'lucide-react';

interface RoleGuardProps {
  roles?: UserRole[];
  permission?: PagePermission;
  children: ReactNode;
  fallback?: ReactNode;
  showDenied?: boolean;
}

/**
 * Conditionally renders children based on role or permission.
 *
 * Usage:
 *   <RoleGuard roles={['admin', 'engineer']}>...</RoleGuard>
 *   <RoleGuard permission="devices">...</RoleGuard>
 */
export function RoleGuard({ roles, permission, children, fallback, showDenied = false }: RoleGuardProps) {
  const { role, hasPermission } = useRole();

  const hasAccess = () => {
    if (permission) return hasPermission(permission);
    if (roles) return roles.includes(role as UserRole);
    return true;
  };

  if (!hasAccess()) {
    if (showDenied) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border/40 bg-secondary/20 p-8 text-center">
          <Shield className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="font-semibold text-foreground">Access Restricted</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {permission
                ? `You need "${permission}" permission to access this area.`
                : `You need ${roles?.join(' or ')} role to access this area.`}
            </p>
          </div>
        </div>
      );
    }
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
