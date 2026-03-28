import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

export type UserRole =
  | 'super_admin'
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
  | 'admin'
  | 'super_admin'
  | 'console';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';
export type PermissionModule = 'dashboard' | 'tickets' | 'projects' | 'documents' | 'billing' | 'reports' | 'devices' | 'scada' | 'oms' | 'users' | 'admin';

export const ROLE_LABELS: Record<string, string> = {
  super_admin:           'Super Admin',
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

export const SUBPAGE_DEFINITIONS: Record<string, string[]> = {
  admin:   ['admin.users', 'admin.roles', 'admin.teams', 'admin.system', 'admin.infrastructure', 'admin.activity'],
  reports: ['reports.pump', 'reports.electrical', 'reports.oms', 'reports.rssi'],
  devices: ['devices.lorawan', 'devices.wifi', 'devices.gsm', 'devices.bluetooth'],
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
  super_admin:  'Super Admin',
  console:      'Console',
};

export const ROLE_DEFAULT_PERMISSIONS: Record<string, PagePermission[]> = {
  super_admin:           ['dashboard', 'devices', 'scada', 'oms', 'reports', 'tickets', 'documents', 'billing_view', 'admin', 'super_admin', 'console'],
  admin:                 ['dashboard', 'devices', 'scada', 'oms', 'reports', 'tickets', 'documents', 'billing_view', 'admin', 'console'],
  ews:                   ['dashboard', 'devices', 'scada', 'console'],
  ows:                   ['dashboard', 'devices', 'scada', 'oms', 'console'],
  wua:                   ['dashboard', 'oms', 'reports'],
  survey:                ['dashboard', 'tickets'],
  executive_mechanic:    ['dashboard', 'tickets'],
  executive_electrical:  ['dashboard', 'tickets'],
  executive_civil:       ['dashboard', 'tickets'],
  supervisor:            ['dashboard', 'devices', 'scada', 'oms', 'tickets', 'console'],
  quality_assurance:     ['dashboard', 'tickets', 'oms', 'reports'],
  engineer:              ['dashboard', 'devices', 'scada', 'oms', 'reports', 'console'],
  operator:              ['dashboard', 'reports'],
};

export const ALL_ROLES: UserRole[] = [
  'admin', 'ews', 'ows', 'wua', 'survey',
  'executive_mechanic', 'executive_electrical', 'executive_civil',
  'supervisor', 'quality_assurance',
];

export const ALL_PAGES: PagePermission[] = [
  'dashboard', 'devices', 'scada', 'oms', 'reports',
  'tickets', 'documents', 'billing_view', 'admin', 'super_admin', 'console'
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
  isSuperAdmin: boolean;
  isEngineer: boolean;
  isOperator: boolean;
  canWrite: boolean;
  canAdmin: boolean;
  isReadOnly: boolean;
  isSingleMode: boolean;
  userType: 'individual' | 'team';
  hasPermission: (page: PagePermission) => boolean;
  canAccess: (page: PagePermission) => boolean;
  canDo: (module: PermissionModule, action: PermissionAction) => boolean;
  canAccessSubpage: (page: string, subpage: string) => boolean;
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
      isSuperAdmin: false,
      isEngineer: true,
      isOperator: true,
      canWrite: true,
      canAdmin: true,
      isReadOnly: false,
      isSingleMode: true,
      userType: 'individual' as const,
      hasPermission: () => true,
      canAccess: () => true,
      canDo: () => true,
      canAccessSubpage: () => true,
    };
  }

  // Team mode: use actual stored role + permissions
  const role = (user?.role ?? 'operator') as string;
  const permissions = ((user?.permissions ?? []) as PagePermission[]);
  const isSuperAdmin = role === 'super_admin';
  const isAdminRole = role === 'admin' || role === 'super_admin';
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
    const writeRoles: string[] = ['supervisor', 'ews', 'ows', 'engineer', 'admin', 'super_admin'];

    if (action === 'view') return canViewModule;
    if (action === 'create' || action === 'edit') return writeRoles.includes(role) && canViewModule;
    if (action === 'delete') return ['admin', 'super_admin'].includes(role) && canViewModule;
    if (action === 'approve') return ['supervisor', 'admin', 'super_admin'].includes(role) && canViewModule;
    return false;
  };

  const writeRoles = ['engineer', 'supervisor', 'ews', 'ows', 'admin', 'super_admin'];
  const canWrite = hasAdminBypass || writeRoles.includes(role);
  const canAdmin = hasPermission('admin');
  const userType: 'individual' | 'team' = user?.userType ?? 'team';

  const canAccessSubpage = (page: string, subpage: string): boolean => {
    if (!hasPermission(page as PagePermission)) return false;
    if (hasAdminBypass) return true;
    if (!SUBPAGE_DEFINITIONS[page]) return true; // no subpages defined for this page → allow all
    const userSubpages = user?.subpagePermissions ?? [];
    if (userSubpages.length === 0) return true; // no restrictions set → allow all
    return userSubpages.includes(`${page}.${subpage}`);
  };

  return {
    role,
    permissions,
    isAdmin: hasAdminBypass,
    isAdminRole,
    isSuperAdmin,
    isEngineer: role === 'engineer' || role === 'ews',
    isOperator: role === 'operator' || role === 'ows',
    canWrite,
    canAdmin,
    isReadOnly: !canWrite,
    isSingleMode: false,
    userType,
    hasPermission,
    canAccess: hasPermission,
    canDo,
    canAccessSubpage,
  };
}
