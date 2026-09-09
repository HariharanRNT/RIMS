import React from 'react';
import {
  CircleDot,
  Code2,
  CheckCircle2,
  FlaskConical,
  ClipboardCheck,
  Package,
  Truck,
  Undo2,
  PauseCircle,
} from 'lucide-react';

export interface StatusStyleConfig {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export const getStatusStyles = (st: string): StatusStyleConfig => {
  switch (st?.toLowerCase()?.trim()) {
    case 'new':
      return {
        bg: 'rgba(100, 116, 139, 0.12)',
        text: '#64748B',
        border: 'rgba(100, 116, 139, 0.28)',
        dot: '#64748B',
      };
    case 'development in progress':
    case 'in development':
      return {
        bg: 'rgba(59, 130, 246, 0.12)',
        text: '#2563EB',
        border: 'rgba(59, 130, 246, 0.3)',
        dot: '#3B82F6',
      };
    case 'development completed':
      return {
        bg: 'rgba(2, 132, 199, 0.12)',
        text: '#0284C7',
        border: 'rgba(2, 132, 199, 0.3)',
        dot: '#0284C7',
      };
    case 'moved to testing':
    case 'testing in progress':
    case 'in qa testing':
    case 'in qa':
      return {
        bg: 'rgba(139, 92, 246, 0.12)',
        text: '#7C3AED',
        border: 'rgba(139, 92, 246, 0.3)',
        dot: '#8B5CF6',
      };
    case 'testing completed':
      return {
        bg: 'rgba(13, 148, 136, 0.12)',
        text: '#0D9488',
        border: 'rgba(13, 148, 136, 0.3)',
        dot: '#0D9488',
      };
    case 'ready for delivery':
      return {
        bg: 'rgba(217, 119, 6, 0.12)',
        text: '#D97706',
        border: 'rgba(217, 119, 6, 0.3)',
        dot: '#F59E0B',
      };
    case 'delivered':
      return {
        bg: 'rgba(16, 185, 129, 0.14)',
        text: '#059669',
        border: 'rgba(16, 185, 129, 0.35)',
        dot: '#10B981',
      };
    case 'reopened':
    case 'rejected':
      return {
        bg: 'rgba(239, 68, 68, 0.12)',
        text: '#DC2626',
        border: 'rgba(239, 68, 68, 0.3)',
        dot: '#EF4444',
      };
    case 'on hold':
      return {
        bg: 'rgba(113, 113, 122, 0.14)',
        text: '#71717A',
        border: 'rgba(113, 113, 122, 0.3)',
        dot: '#71717A',
      };
    default:
      return {
        bg: 'rgba(148, 163, 184, 0.12)',
        text: '#64748B',
        border: 'rgba(148, 163, 184, 0.25)',
        dot: '#94A3B8',
      };
  }
};

const getStatusIcon = (st: string, iconSize: number) => {
  switch (st?.toLowerCase()?.trim()) {
    case 'new':
      return <CircleDot size={iconSize} />;
    case 'development in progress':
    case 'in development':
      return <Code2 size={iconSize} />;
    case 'development completed':
      return <CheckCircle2 size={iconSize} />;
    case 'moved to testing':
    case 'testing in progress':
    case 'in qa testing':
    case 'in qa':
      return <FlaskConical size={iconSize} />;
    case 'testing completed':
      return <ClipboardCheck size={iconSize} />;
    case 'ready for delivery':
      return <Package size={iconSize} />;
    case 'delivered':
      return <Truck size={iconSize} />;
    case 'reopened':
    case 'rejected':
      return <Undo2 size={iconSize} />;
    case 'on hold':
      return <PauseCircle size={iconSize} />;
    default:
      return <CircleDot size={iconSize} />;
  }
};

interface DeploymentStatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const DeploymentStatusBadge: React.FC<DeploymentStatusBadgeProps> = ({
  status,
  className = '',
  size = 'md',
}) => {
  const style = getStatusStyles(status);
  const isSmall = size === 'sm';
  const iconSize = isSmall ? 11 : 13;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        borderRadius: '999px',
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        padding: isSmall ? '3px 8px 3px 6px' : '4px 10px 4px 8px',
        fontSize: isSmall ? '0.72rem' : '0.76rem',
        fontWeight: 600,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', color: style.dot, flexShrink: 0 }}>
        {getStatusIcon(status, iconSize)}
      </span>
      <span>{status}</span>
    </span>
  );
};
