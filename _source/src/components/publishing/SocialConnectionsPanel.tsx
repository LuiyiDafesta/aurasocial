import { useState, useEffect, useCallback } from 'react';
import { SocialConnection, SocialPlatform } from '../../types/publishing';
import { 
  getSocialConnections, 
  getOrCreateMockConnection, 
  deleteSocialConnection 
} from '../../services/socialConnectionService';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { 
  Instagram, 
  Facebook, 
  Video, 
  Youtube, 
  Linkedin, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface SocialConnectionsPanelProps {
  brandId: string;
  workspaceId: string;
  brandName?: string;
}

interface PlatformConfig {
  platform: SocialPlatform;
  name: string;
  icon: React.ReactNode;
  color: string;
  badgeColor: string;
}

const PLATFORMS_CONFIG: PlatformConfig[] = [
  {
    platform: 'instagram',
    name: 'Instagram Business',
    icon: <Instagram className="w-4 h-4" />,
    color: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  },
  {
    platform: 'tiktok',
    name: 'TikTok Creator',
    icon: <Video className="w-4 h-4" />,
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  },
  {
    platform: 'facebook',
    name: 'Facebook Page',
    icon: <Facebook className="w-4 h-4" />,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  {
    platform: 'youtube',
    name: 'YouTube Shorts',
    icon: <Youtube className="w-4 h-4" />,
    color: 'text-red-400 bg-red-500/10 border-red-500/30',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
  },
  {
    platform: 'linkedin',
    name: 'LinkedIn Company',
    icon: <Linkedin className="w-4 h-4" />,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
];

export function SocialConnectionsPanel({
  brandId,
  workspaceId,
  brandName,
}: SocialConnectionsPanelProps) {
  const { toast } = useToast();
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [connectingPlatform, setConnectingPlatform] = useState<SocialPlatform | null>(null);

  const loadConnections = useCallback(async () => {
    if (!brandId) return;
    try {
      setIsLoading(true);
      const conns = await getSocialConnections(brandId);
      setConnections(conns);
    } catch (err) {
      console.error('Error al cargar conexiones:', err);
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const handleConnectMock = async (platform: SocialPlatform) => {
    try {
      setConnectingPlatform(platform);
      await getOrCreateMockConnection(brandId, workspaceId, platform, brandName);
      toast(`Canal ${platform} conectado en modo Mock`, { type: 'success' });
      await loadConnections();
    } catch (err: any) {
      toast(`Error al conectar ${platform}: ${err.message}`, { type: 'error' });
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (connectionId: string, platformName: string) => {
    try {
      await deleteSocialConnection(connectionId);
      toast(`Conexión de ${platformName} eliminada`, { type: 'success' });
      await loadConnections();
    } catch (err: any) {
      toast(`Error al desconectar: ${err.message}`, { type: 'error' });
    }
  };

  return (
    <div className="space-y-4 p-5 rounded-2xl bg-dark-950 border border-dark-800 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-aura-400" />
            Canales Sociales Conectados ({connections.length} / 5)
          </h3>
          <p className="text-[11px] text-slate-400">
            Conexiones de prueba seguras (Mock OAuth) para validación de publicaciones con costo $0.00 USD
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadConnections}
          disabled={isLoading}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          className="text-xs border-dark-700 text-slate-300"
        >
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {PLATFORMS_CONFIG.map((cfg) => {
          const conn = connections.find((c) => c.platform === cfg.platform && c.status === 'mock_connected');
          const isConnecting = connectingPlatform === cfg.platform;

          return (
            <div
              key={cfg.platform}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                conn ? 'bg-dark-900/90 border-dark-700' : 'bg-dark-950/40 border-dark-800/80 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${cfg.color}`}>
                    {cfg.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{cfg.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                      {conn?.account_username || 'Sin cuenta conectada'}
                    </p>
                  </div>
                </div>

                {conn ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-2.5 h-2.5 text-sky-400" />
                    MOCK CONNECTED
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">
                    Desconectado
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-dark-800/60">
                {conn ? (
                  <button
                    onClick={() => handleDisconnect(conn.id, cfg.name)}
                    className="text-[11px] text-rose-400/80 hover:text-rose-300 flex items-center gap-1 transition-colors p-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Desconectar
                  </button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={isConnecting}
                    onClick={() => handleConnectMock(cfg.platform)}
                    leftIcon={<Plus className="w-3 h-3" />}
                    className="text-[11px] border-dark-700 hover:border-aura-500/50 text-slate-200 py-1"
                  >
                    Conectar Mock
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
