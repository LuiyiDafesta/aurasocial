import { useState, useRef, useEffect } from 'react';
import { Brand } from '../../types/database';
import { 
  ChevronDown, 
  Plus, 
  Check, 
  Settings2,
  Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface BrandSwitcherProps {
  brands: Brand[];
  currentBrand: Brand | null;
  onSelectBrand: (brandId: string) => void;
  onCreateNewBrand: () => void;
  onEditBrandBrain: () => void;
  isSwitching?: boolean;
}

export function BrandSwitcher({
  brands,
  currentBrand,
  onSelectBrand,
  onCreateNewBrand,
  onEditBrandBrain,
  isSwitching = false,
}: BrandSwitcherProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBrandInitials = (name?: string) => {
    if (!name) return 'AS';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Active Brand Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-dark-900 border border-dark-800 hover:border-aura-500/40 hover:bg-dark-850 text-left transition-all group',
          isSwitching && 'opacity-60 animate-pulse'
        )}
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-aura-500/20 to-pink-500/20 border border-aura-500/30 text-aura-300 flex items-center justify-center font-bold text-xs shrink-0">
          {getBrandInitials(currentBrand?.name)}
        </div>

        <div className="flex flex-col min-w-0 pr-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Marca Activa
          </span>
          <span className="text-xs font-bold text-white truncate max-w-[150px] group-hover:text-aura-300 transition-colors">
            {currentBrand?.name || 'Seleccionar Marca'}
          </span>
        </div>

        <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform shrink-0', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 text-[10px] uppercase font-bold text-slate-400 border-b border-dark-800 flex items-center justify-between">
            <span>Tus Marcas ({brands.length})</span>
            <Sparkles className="w-3 h-3 text-aura-400" />
          </div>

          {/* List of brands */}
          <div className="max-h-48 overflow-y-auto space-y-1 py-1">
            {brands.map((b) => {
              const isSelected = currentBrand?.id === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    onSelectBrand(b.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left',
                    isSelected
                      ? 'bg-aura-500/15 text-aura-300 border border-aura-500/30'
                      : 'text-slate-300 hover:bg-dark-800 hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-dark-950 border border-dark-800 flex items-center justify-center font-bold text-[10px] text-slate-300 shrink-0">
                      {getBrandInitials(b.name)}
                    </div>
                    <div className="truncate">
                      <div className="truncate">{b.name}</div>
                      <div className="text-[10px] text-slate-500 font-normal truncate">
                        {b.industry || 'General'}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-aura-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-dark-800 space-y-1">
            {currentBrand && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onEditBrandBrain();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-dark-800 transition-colors text-left"
              >
                <Settings2 className="w-4 h-4 text-aura-400 shrink-0" />
                <span>Configurar Brand Brain</span>
              </button>
            )}

            <button
              onClick={() => {
                setIsOpen(false);
                onCreateNewBrand();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-aura-300 bg-aura-500/10 hover:bg-aura-500/20 border border-aura-500/20 transition-colors text-left"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>+ Crear Nueva Marca</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
