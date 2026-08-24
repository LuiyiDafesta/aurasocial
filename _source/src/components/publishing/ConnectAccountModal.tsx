import { useState } from 'react';
import { DiscoveredSocialAccount } from '../../types/publishing';
import { Button } from '../common/Button';
import { 
  Instagram, 
  Facebook, 
  Video, 
  Youtube, 
  Linkedin, 
  Check, 
  X, 
  Layers, 
  ShieldCheck 
} from 'lucide-react';

interface ConnectAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedAccounts: DiscoveredSocialAccount[]) => Promise<void>;
  discoveredAccounts: DiscoveredSocialAccount[];
  brandName?: string;
  isSaving?: boolean;
}

export function ConnectAccountModal({
  isOpen,
  onClose,
  onConfirm,
  discoveredAccounts,
  brandName = 'Mi Marca',
  isSaving = false,
}: ConnectAccountModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    discoveredAccounts.map((a) => a.id)
  );

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirm = async () => {
    const selected = discoveredAccounts.filter((a) => selectedIds.includes(a.id));
    await onConfirm(selected);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="w-4 h-4 text-pink-400" />;
      case 'facebook':
        return <Facebook className="w-4 h-4 text-blue-400" />;
      case 'tiktok':
        return <Video className="w-4 h-4 text-teal-400" />;
      case 'youtube':
        return <Youtube className="w-4 h-4 text-red-400" />;
      case 'linkedin':
        return <Linkedin className="w-4 h-4 text-sky-400" />;
      default:
        return <Layers className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Vincular Cuentas Sociales</h3>
              <p className="text-xs text-zinc-400">Marca activa: <span className="text-zinc-200 font-medium">{brandName}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-zinc-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-zinc-400">
            Seleccioná las páginas o cuentas que deseás conectar a esta marca para habilitar la futura publicación:
          </p>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {discoveredAccounts.map((acc) => {
              const isSelected = selectedIds.includes(acc.id);
              return (
                <div
                  key={acc.id}
                  onClick={() => toggleSelect(acc.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-950/30 border-indigo-500/50 text-white'
                      : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0">
                      {getPlatformIcon(acc.platform)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-100">{acc.account_name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded font-mono capitalize">
                          {acc.account_type.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 font-mono block">
                        {acc.username || `@${acc.id.slice(0, 10)}`}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'border-zinc-700 bg-zinc-900'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-zinc-800 bg-zinc-950/60">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSaving}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIds.length === 0 || isSaving}
            isLoading={isSaving}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
          >
            <Check className="w-4 h-4" />
            Conectar Seleccionadas ({selectedIds.length})
          </Button>
        </div>
      </div>
    </div>
  );
}
