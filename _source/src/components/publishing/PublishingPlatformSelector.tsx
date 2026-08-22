import { SocialPlatform } from '../../types/publishing';
import { Instagram, Facebook, Video, Youtube, Linkedin, Check } from 'lucide-react';

interface PublishingPlatformSelectorProps {
  availablePlatforms: SocialPlatform[];
  selectedPlatforms: SocialPlatform[];
  onChange: (platforms: SocialPlatform[]) => void;
}

const PLATFORM_LABELS: Record<SocialPlatform, { name: string; icon: React.ReactNode }> = {
  instagram: { name: 'Instagram', icon: <Instagram className="w-4 h-4 text-pink-400" /> },
  tiktok: { name: 'TikTok', icon: <Video className="w-4 h-4 text-teal-400" /> },
  facebook: { name: 'Facebook', icon: <Facebook className="w-4 h-4 text-blue-400" /> },
  youtube: { name: 'YouTube', icon: <Youtube className="w-4 h-4 text-red-400" /> },
  linkedin: { name: 'LinkedIn', icon: <Linkedin className="w-4 h-4 text-sky-400" /> },
};

export function PublishingPlatformSelector({
  availablePlatforms,
  selectedPlatforms,
  onChange,
}: PublishingPlatformSelectorProps) {
  const togglePlatform = (platform: SocialPlatform) => {
    if (selectedPlatforms.includes(platform)) {
      onChange(selectedPlatforms.filter((p) => p !== platform));
    } else {
      onChange([...selectedPlatforms, platform]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
        <span>Seleccionar Destinos de Publicación ({selectedPlatforms.length})</span>
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {availablePlatforms.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform);
          const meta = PLATFORM_LABELS[platform] || { name: platform, icon: null };

          return (
            <button
              key={platform}
              type="button"
              onClick={() => togglePlatform(platform)}
              className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                isSelected
                  ? 'bg-aura-500/15 border-aura-500/50 text-white shadow-sm'
                  : 'bg-dark-900 border-dark-700 text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                {meta.icon}
                <span className="text-xs font-semibold">{meta.name}</span>
              </div>

              <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                isSelected ? 'bg-aura-500 border-aura-400 text-white' : 'border-dark-600 bg-dark-950'
              }`}>
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
