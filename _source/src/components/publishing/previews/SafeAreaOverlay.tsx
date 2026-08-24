import { SocialPlatform } from '../../../types/publishing';
import { getPlatformSafeArea } from '../../../config/safeAreaProfiles';
import { ShieldAlert } from 'lucide-react';

interface SafeAreaOverlayProps {
  platform: SocialPlatform;
  isVisible: boolean;
}

export function SafeAreaOverlay({ platform, isVisible }: SafeAreaOverlayProps) {
  if (!isVisible) return null;

  const profile = getPlatformSafeArea(platform);
  if (!profile.hasVerticalSafeAreas) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between select-none">
      
      {/* Top Danger Zone */}
      <div 
        style={{ height: `${profile.topMarginPercent}%` }}
        className="w-full bg-rose-500/25 border-b-2 border-dashed border-rose-400/80 backdrop-blur-[1px] flex items-center justify-center"
      >
        <span className="px-2 py-0.5 rounded bg-black/75 text-[10px] font-mono font-bold text-rose-300 flex items-center gap-1 shadow">
          <ShieldAlert className="w-3 h-3 text-rose-400" />
          ZONA SUPERIOR ({profile.topMarginPercent}%)
        </span>
      </div>

      {/* Middle Safe & Side Zones */}
      <div className="flex-1 flex justify-between relative">
        {/* Left Margin */}
        <div 
          style={{ width: `${profile.leftMarginPercent}%` }}
          className="h-full bg-amber-500/15 border-r border-dashed border-amber-400/50"
        />

        {/* Center Active Safe Zone */}
        <div className="flex-1 flex items-center justify-center relative">
          <div className="border border-emerald-400/40 rounded-xl p-2 bg-emerald-500/5 text-center">
            <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-widest bg-black/60 px-2 py-0.5 rounded">
              ✓ SAFE AREA ACTIVA
            </span>
          </div>
        </div>

        {/* Right Interaction Buttons Zone */}
        <div 
          style={{ width: `${profile.rightMarginPercent}%` }}
          className="h-full bg-rose-500/25 border-l-2 border-dashed border-rose-400/80 backdrop-blur-[1px] flex items-center justify-center"
        >
          <span className="px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-mono font-bold text-rose-300 rotate-90 whitespace-nowrap shadow">
            UI LATERAL ({profile.rightMarginPercent}%)
          </span>
        </div>
      </div>

      {/* Bottom Danger Zone */}
      <div 
        style={{ height: `${profile.bottomMarginPercent}%` }}
        className="w-full bg-rose-500/25 border-t-2 border-dashed border-rose-400/80 backdrop-blur-[1px] flex items-center justify-center"
      >
        <span className="px-2 py-0.5 rounded bg-black/75 text-[10px] font-mono font-bold text-rose-300 flex items-center gap-1 shadow">
          <ShieldAlert className="w-3 h-3 text-rose-400" />
          ZONA INFERIOR / CAPTION ({profile.bottomMarginPercent}%)
        </span>
      </div>

    </div>
  );
}
