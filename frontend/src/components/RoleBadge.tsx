'use client';

import { UserRole, ROLE_LABELS } from '@/hooks/useRole';
import {
  Crown, Wrench, Shield, Radio,
  ClipboardList, Zap, Building2,
  CheckSquare, Droplets, Users
} from 'lucide-react';

type RoleConfig = {
  label: string;
  className: string;
  icon: React.ElementType;
};

const ROLE_CONFIG: Record<string, RoleConfig> = {
  admin:                 { label: 'Admin',            className: 'bg-red-500/15 text-red-400 border-red-500/30',           icon: Crown },
  ews:                   { label: 'EWS',              className: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',         icon: Radio },
  ows:                   { label: 'OWS',              className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',         icon: Radio },
  wua:                   { label: 'WUA',              className: 'bg-sky-500/15 text-sky-400 border-sky-500/30',            icon: Droplets },
  survey:                { label: 'Survey',           className: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',   icon: ClipboardList },
  executive_mechanic:    { label: 'Exec (Mech)',      className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',      icon: Wrench },
  executive_electrical:  { label: 'Exec (Elec)',      className: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30',   icon: Zap },
  executive_civil:       { label: 'Exec (Civil)',     className: 'bg-lime-500/15 text-lime-400 border-lime-500/30',         icon: Building2 },
  supervisor:            { label: 'Supervisor',       className: 'bg-orange-400/15 text-orange-300 border-orange-400/30',   icon: Shield },
  quality_assurance:     { label: 'Quality Assurance',className: 'bg-rose-500/15 text-rose-400 border-rose-500/30',         icon: CheckSquare },
  // Legacy aliases
  engineer:              { label: 'EWS',              className: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',         icon: Radio },
  operator:              { label: 'OWS',              className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',         icon: Radio },
};

const DEFAULT_CONFIG: RoleConfig = {
  label: 'Unknown',
  className: 'bg-secondary/50 text-muted-foreground border-border/50',
  icon: Users,
};

interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  showFull?: boolean;
}

export function RoleBadge({ role, size = 'sm', showIcon = true, showFull = false }: RoleBadgeProps) {
  const config = ROLE_CONFIG[role] ?? DEFAULT_CONFIG;
  const Icon = config.icon;
  const label = showFull ? (ROLE_LABELS[role as UserRole] ?? config.label) : config.label;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 font-medium whitespace-nowrap ${config.className} ${
        size === 'sm' ? 'py-0.5 text-[10px]' : 'py-1 text-xs'
      }`}
    >
      {showIcon && <Icon className={size === 'sm' ? 'h-2.5 w-2.5 shrink-0' : 'h-3 w-3 shrink-0'} />}
      {label}
    </span>
  );
}
