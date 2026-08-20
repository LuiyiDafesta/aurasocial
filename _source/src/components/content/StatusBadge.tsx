import { Badge } from '../common/Badge';
import { ContentStatus } from '../../types/contentItem';

interface StatusBadgeProps {
  status: ContentStatus | string;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const getStatusConfig = (s: string) => {
    switch (s?.toLowerCase()) {
      case 'draft':
        return { label: 'Borrador', variant: 'warning' as const };
      case 'approved':
        return { label: 'Aprobado', variant: 'success' as const };
      case 'scheduled':
        return { label: 'Programado', variant: 'info' as const };
      case 'published':
        return { label: 'Publicado', variant: 'aura' as const };
      case 'rejected':
        return { label: 'Rechazado', variant: 'danger' as const };
      default:
        return { label: status || 'Desconocido', variant: 'neutral' as const };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge variant={config.variant} size={size} dot className={className}>
      {config.label}
    </Badge>
  );
}
