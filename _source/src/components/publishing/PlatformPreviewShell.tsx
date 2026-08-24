import { useState } from 'react';
import { PublicationPackage, SocialPlatform } from '../../types/publishing';
import { InstagramReelPreview } from './previews/InstagramReelPreview';
import { TikTokPreview } from './previews/TikTokPreview';
import { FacebookFeedPreview } from './previews/FacebookFeedPreview';
import { LinkedInPostPreview } from './previews/LinkedInPostPreview';
import { YouTubeShortsPreview } from './previews/YouTubeShortsPreview';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Instagram, 
  Video, 
  Facebook, 
  Linkedin, 
  Youtube 
} from 'lucide-react';

interface PlatformPreviewShellProps {
  publicationPackage: PublicationPackage;
  brandName?: string;
  avatarUrl?: string;
  onPlatformChange?: (platform: SocialPlatform) => void;
  availablePlatforms?: SocialPlatform[];
}

const PLATFORM_ICONS: Record<SocialPlatform, { label: string; icon: React.ReactNode }> = {
  instagram: { label: 'Instagram Reel', icon: <Instagram className="w-4 h-4 text-pink-400" /> },
  tiktok: { label: 'TikTok Video', icon: <Video className="w-4 h-4 text-teal-400" /> },
  facebook: { label: 'Facebook Feed', icon: <Facebook className="w-4 h-4 text-blue-400" /> },
  linkedin: { label: 'LinkedIn Post', icon: <Linkedin className="w-4 h-4 text-sky-400" /> },
  youtube: { label: 'YouTube Shorts', icon: <Youtube className="w-4 h-4 text-red-400" /> },
};

export function PlatformPreviewShell({
  publicationPackage,
  brandName = 'Mi Marca',
  avatarUrl,
  onPlatformChange,
  availablePlatforms = ['instagram', 'tiktok', 'facebook', 'linkedin', 'youtube'],
}: PlatformPreviewShellProps) {
  const [showSafeAreas, setShowSafeAreas] = useState<boolean>(false);
  const currentPlatform = publicationPackage.platform;
  const isVertical = ['instagram', 'tiktok', 'youtube'].includes(currentPlatform);

  return (
    <div className="flex flex-col space-y-4">
      
      {/* Top Toolbar: Platform Switcher & Safe Area Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-dark-800">
        <div className="flex items-center gap-1.5 flex-wrap">
          {availablePlatforms.map((platform) => {
            const isSelected = currentPlatform === platform;
            const config = PLATFORM_ICONS[platform];

            return (
              <button
                key={platform}
                onClick={() => onPlatformChange && onPlatformChange(platform)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/50'
                    : 'bg-dark-900 border border-dark-800 text-slate-400 hover:text-slate-200 hover:border-dark-700'
                }`}
              >
                {config.icon}
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>

        {/* Safe Area Switcher for vertical platforms */}
        {isVertical && (
          <button
            onClick={() => setShowSafeAreas(!showSafeAreas)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              showSafeAreas
                ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 shadow-md ring-1 ring-rose-500/40'
                : 'bg-dark-900 border border-dark-800 text-slate-400 hover:text-white'
            }`}
          >
            {showSafeAreas ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Safe Areas: ON</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Safe Areas: OFF</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Visual Preview Area */}
      <div className="flex justify-center p-2">
        {currentPlatform === 'instagram' && (
          <InstagramReelPreview
            publicationPackage={publicationPackage}
            brandName={brandName}
            avatarUrl={avatarUrl}
            showSafeAreas={showSafeAreas}
          />
        )}

        {currentPlatform === 'tiktok' && (
          <TikTokPreview
            publicationPackage={publicationPackage}
            brandName={brandName}
            avatarUrl={avatarUrl}
            showSafeAreas={showSafeAreas}
          />
        )}

        {currentPlatform === 'facebook' && (
          <FacebookFeedPreview
            publicationPackage={publicationPackage}
            brandName={brandName}
            avatarUrl={avatarUrl}
          />
        )}

        {currentPlatform === 'linkedin' && (
          <LinkedInPostPreview
            publicationPackage={publicationPackage}
            brandName={brandName}
            avatarUrl={avatarUrl}
          />
        )}

        {currentPlatform === 'youtube' && (
          <YouTubeShortsPreview
            publicationPackage={publicationPackage}
            brandName={brandName}
            avatarUrl={avatarUrl}
            showSafeAreas={showSafeAreas}
          />
        )}
      </div>

    </div>
  );
}
