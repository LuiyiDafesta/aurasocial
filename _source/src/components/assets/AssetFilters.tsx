import { AssetType, AssetSortOption, AssetScope } from '../../types/contentAsset';
import { Search, ArrowUpDown, Filter, Sparkles } from 'lucide-react';

interface AssetFiltersProps {
  searchTerm: string;
  onSearchChange: (search: string) => void;
  selectedType: AssetType | 'all';
  onTypeChange: (type: AssetType | 'all') => void;
  sortBy: AssetSortOption;
  onSortChange: (sort: AssetSortOption) => void;
  selectedScope?: AssetScope | 'all';
  onScopeChange?: (scope: AssetScope | 'all') => void;
  showScopeFilter?: boolean;
}

export function AssetFilters({
  searchTerm,
  onSearchChange,
  selectedType,
  onTypeChange,
  sortBy,
  onSortChange,
  selectedScope = 'all',
  onScopeChange,
  showScopeFilter = false,
}: AssetFiltersProps) {
  const assetTypesList: { label: string; value: AssetType | 'all' }[] = [
    { label: 'Todos', value: 'all' },
    { label: 'Imágenes', value: 'image' },
    { label: 'Videos', value: 'video' },
    { label: 'Audios', value: 'audio' },
    { label: 'Documentos / PDF', value: 'document' },
    { label: 'B-Roll', value: 'b_roll' },
    { label: 'Raw Footage', value: 'raw_footage' },
    { label: 'Thumbnails', value: 'thumbnail' },
    { label: 'Logos', value: 'logo' },
    { label: 'Brand Books', value: 'brand_book' },
  ];

  return (
    <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-4 space-y-3.5">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar assets por nombre o archivo..."
            className="w-full bg-dark-950 border border-dark-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-aura-500"
          />
        </div>

        {/* Sort & Scope Selectors */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {showScopeFilter && onScopeChange && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-950 border border-dark-800 text-xs text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-aura-400" />
              <span>Alcance:</span>
              <select
                value={selectedScope}
                onChange={(e) => onScopeChange(e.target.value as AssetScope | 'all')}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-dark-900">Todos</option>
                <option value="brand" className="bg-dark-900">Marca</option>
                <option value="campaign" className="bg-dark-900">Campaña</option>
                <option value="content" className="bg-dark-900">Contenido</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-950 border border-dark-800 text-xs text-slate-400">
            <ArrowUpDown className="w-3.5 h-3.5 text-aura-400" />
            <span>Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as AssetSortOption)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="newest" className="bg-dark-900">Más recientes</option>
              <option value="oldest" className="bg-dark-900">Más antiguos</option>
              <option value="name_asc" className="bg-dark-900">Nombre (A-Z)</option>
              <option value="name_desc" className="bg-dark-900">Nombre (Z-A)</option>
              <option value="size_desc" className="bg-dark-900">Mayor tamaño</option>
              <option value="size_asc" className="bg-dark-900">Menor tamaño</option>
            </select>
          </div>
        </div>
      </div>

      {/* Asset Types Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3 text-slate-400" /> Tipo:
        </span>
        {assetTypesList.map((t) => (
          <button
            key={t.value}
            onClick={() => onTypeChange(t.value)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap text-[11px] ${
              selectedType === t.value
                ? 'bg-aura-500 text-dark-950 font-bold shadow-sm'
                : 'bg-dark-950 text-slate-400 hover:text-white border border-dark-800 hover:border-dark-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
