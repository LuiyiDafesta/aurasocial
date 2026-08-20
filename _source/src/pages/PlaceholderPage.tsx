import { LucideIcon, Sparkles } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  badgeText?: string;
}

export function PlaceholderPage({
  title,
  description,
  icon: Icon,
  badgeText = 'Próximamente en Fase Posterior',
}: PlaceholderPageProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-4 bg-dark-900/60 border border-dark-800 rounded-2xl p-8 backdrop-blur-xl shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-dark-700/80 flex items-center justify-center text-aura-400 mx-auto shadow-inner">
          <Icon className="w-8 h-8" />
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-aura-500/10 text-aura-300 border border-aura-500/25 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            {badgeText}
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
