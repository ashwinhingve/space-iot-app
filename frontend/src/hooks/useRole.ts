import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

export type UserRole =
  | 'admin'
  | 'ews'
  | 'ows'
  | 'wua'
  | 'survey'
  | 'executive_mechanic'
  | 'executive_electrical'
  | 'executive_civil'
  | 'supervisor'
  | 'quality_assurance'
  // Legacy aliases kept for backward compat with existing DB documents
  | 'engineer' | 'operator';

export type PagePermission =
  | 'dashboard'
  | 'devices'
  | 'scada'
  | 'oms'
  | 'reports'
  | 'tickets'
  | 'documents'
  | 'billing_view'
  | 'admin';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';
export type PermissionModule = 'dashboard' | 'tickets' | 'projects' | 'documents' | 'billing' | 'reports' | 'devices' | 'scada' | 'oms' | 'users' | 'admin';

export const ROLE_LABELS: Record<string, string> = {
  admin:                 'Admin',
  ews:                   'EWS',
  ows:                   'OWS',
  wua:                   'WUA',
  survey:                'Survey',
  executive_mechanic:    'Executive (Mechanic)',
  executive_electrical:  'Executive (Electrical)',
  executive_civil:       'Executive (Civil)',
  supervisor:            'Supervisor',
  quality_assurance:     'Quality Assurance',
  engineer:              'EWS',
  operator:              'OWS',
};

export const PAGE_LABELS: Record<PagePermission, string> = {
  dashboard:    'Dashboard',
  devices:      'Devices',
  scada:        'SCADA',
  oms:          'OMS',
  reports:      'Reports',
  tickets:      'Tickets',
  documents:    'Documents',
  billing_view: 'Billing',
  admin:        'Admin Panel',
};

export const ROLE_DEFAULT_PERMISSIONS: Record<string, PagePermission[]> = {
  admin:                 ['dashboard', 'devices', 'scada', 'oms', 'reports', 'tickets', 'documents', 'billing_view', 'admin'],
  ews:                   ['dashboard', 'devices', 'scada'],
  ows:                   ['dashboard', 'devices', 'scada', 'oms'],
  wua:                   ['dashboard', 'oms', 'reports'],
  survey:                ['dashboard', 'tickets'],
  executive_mechanic:    ['dashboard', 'tickets'],
  executive_electrical:  ['dashboard', 'tickets'],
  executive_civil:       ['dashboard', 'tickets'],
  supervisor:            ['dashboard', 'devices', 'scada', 'oms', 'tickets'],
  quality_assurance:     ['dashboard', 'tickets', 'oms', 'reports'],
  engineer:              ['dashboard', 'devices', 'scada', 'oms', 'reports'],
  operator:              ['dashboard', 'reports'],
};

export const ALL_ROLES: UserRole[] = [
  'admin', 'ews', 'ows', 'wua', 'survey',
  'executive_mechanic', 'executive_electrical', 'executive_civil',
  'supervisor', 'quality_assurance',
];

export const ALL_PAGES: PagePermission[] = [
  'dashboard', 'devices', 'scada', 'oms', 'reports',
  'tickets', 'documents', 'billing_view', 'admin'
];

const FULL_PERMISSIONS: PagePermission[] = ALL_PAGES;
const MODULE_PERMISSION_MAP: Record<PermissionModule, PagePermission> = {
  dashboard: 'dashboard',
  tickets: 'tickets',
  projects: 'dashboard',
  documents: 'documents',
  billing: 'billing_view',
  reports: 'reports',
  devices: 'devices',
  scada: 'scada',
  oms: 'oms',
  users: 'admin',
  admin: 'admin',
};

export interface RoleHelpers {
  role: string;
  permissions: PagePermission[];
  isAdmin: boolean;
  isAdminRole: boolean;
  isEngineer: boolean;
  isOperator: boolean;
  canWrite: boolean;
  canAdmin: boolean;
  isReadOnly: boolean;
  isSingleMode: boolean;
  hasPermission: (page: PagePermission) => boolean;
  canAccess: (page: PagePermission) => boolean;
  canDo: (module: PermissionModule, action: PermissionAction) => boolean;
}

export function useRole(): RoleHelpers {
  const user = useSelector((state: RootState) => state.auth.user);
  const systemMode = useSelector((state: RootState) => state.config.mode);
  const adminAccessMode = useSelector((state: RootState) => state.config.adminAccessMode);

  const isSingleMode = systemMode === 'single';

  // In single-user mode: full admin access regardless of stored role
  if (isSingleMode) {
    return {
      role: 'admin',
      permissions: FULL_PERMISSIONS,
      isAdmin: true,
      isAdminRole: true,
      isEngineer: true,
      isOperator: true,
      canWrite: true,
      canAdmin: true,
      isReadOnly: false,
      isSingleMode: true,
      hasPermission: () => true,
      canAccess: () => true,
      canDo: () => true,
    };
  }

  // Team mode: use actual stored role + permissions
  const role = (user?.role ?? 'operator') as string;
  const permissions = ((user?.permissions ?? []) as PagePermission[]);
  const isAdminRole = role === 'admin';
  const hasAdminBypass = isAdminRole && adminAccessMode === 'super';

  const hasPermission = (page: PagePermission): boolean => {
    if (hasAdminBypass) return true;
    return permissions.includes(page);
  };

  // Fine-grained action check with optional admin bypass mode.
  const canDo = (module: PermissionModule, action: PermissionAction): boolean => {
    if (hasAdminBypass) return true;

    const pagePermission = MODULE_PERMISSION_MAP[module];
    const canViewModule = hasPermission(pagePermission);
    const writeRoles = ['supervisor', 'ews', 'ows', 'engineer', 'admin'];

    if (action === 'view') return canViewModule;
    if (action === 'create' || action === 'edit') return writeRoles.includes(role) && canViewModule;
    if (action === 'delete') return role === 'admin' && canViewModule;
    if (action === 'approve') return ['supervisor', 'admin'].includes(role) && canViewModule;
    return false;
  };

  const writeRoles = ['engineer', 'supervisor', 'ews', 'ows'];
  const canWrite = hasAdminBypass || writeRoles.includes(role);
  const canAdmin = hasPermission('admin');

  return {
    role,
    permissions,
    isAdmin: hasAdminBypass,
    isAdminRole,
    isEngineer: role === 'engineer' || role === 'ews',
    isOperator: role === 'operator' || role === 'ows',
    canWrite,
    canAdmin,
    isReadOnly: !canWrite,
    isSingleMode: false,
    hasPermission,
    canAccess: hasPermission,
    canDo,
  };
}
