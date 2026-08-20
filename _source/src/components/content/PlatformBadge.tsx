import { Facebook, Instagram, Video, Youtube, Linkedin, Globe } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PlatformBadgeProps {
  platform: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export function PlatformBadge({
  platform,
  size = 'md',
  showLabel = true,
  className,
}: PlatformBadgeProps) {
  const normPlatform = platform?.toLowerCase() || '';

  const getPlatformConfig = () => {
    switch (normPlatform) {
      case 'facebook':
        return {
          label: 'Facebook',
          icon: Facebook,
          styles: 'bg-blue-600/10 text-blue-400 border-blue-500/25',
          iconColor: 'text-blue-400',
        };
      case 'instagram':
        return {
          label: 'Instagram',
          icon: Instagram,
          styles: 'bg-pink-600/10 text-pink-400 border-pink-500/25',
          iconColor: 'text-pink-400',
        };
      case 'tiktok':
        return {
          label: 'TikTok',
          icon: Video,
          styles: 'bg-cyan-600/10 text-cyan-400 border-cyan-500/25',
          iconColor: 'text-cyan-400',
        };
      case 'youtube':
        return {
          label: 'YouTube',
          icon: Youtube,
          styles: 'bg-red-600/10 text-red-400 border-red-500/25',
          iconColor: 'text-red-400',
        };
      case 'linkedin':
        return {
          label: 'LinkedIn',
          icon: Linkedin,
          styles: 'bg-sky-600/10 text-sky-400 border-sky-500/25',
          iconColor: 'text-sky-400',
        };
      default:
        return {
          label: platform || 'Social',
          icon: Globe,
          styles: 'bg-slate-800 text-slate-300 border-slate-700',
          iconColor: 'text-slate-400',
        };
    }
  };

  const config = getPlatformConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-lg border uppercase tracking-wider',
        config.styles,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={cn(iconSizes[size], config.iconColor, 'shrink-0')} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
