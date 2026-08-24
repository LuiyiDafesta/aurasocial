import { useState, useEffect, useCallback } from 'react';
import { 
  SocialConnection, 
  SocialPlatform, 
  DiscoveredSocialAccount
} from '../../types/publishing';
import { 
  getSocialConnections, 
  startOAuthFlow, 
  handleOAuthCallback, 
  connectDiscoveredAccount, 
  disconnectSocialConnection, 
  refreshSocialConnectionToken,
  discoverAndSyncSocialitAccounts,
  getBrandAndUnassignedSocialAccounts,
  bindSocialAccount,
  unbindSocialAccount,
  diagnoseSocialConnectionHealth
} from '../../services/socialConnectionService';
import { SocialAccountDiagnosticReport } from '../../services/socialProviders/socialProviderHealthService';
import { socialitProvider } from '../../services/socialProviders/SocialitProvider';
import { n8nOrchestratorService } from '../../services/n8n/n8nOrchestratorService';
import { ConnectAccountModal } from './ConnectAccountModal';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { 
  Instagram, 
  Facebook, 
  Video, 
  Youtube, 
  Linkedin, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  XCircle, 
  RefreshCw, 
  ShieldCheck, 
  ExternalLink,
  PowerOff,
  Sparkles,
  Zap,
  Globe2,
  PlusCircle,
  Unlink,
  Settings
} from 'lucide-react';

interface SocialConnectionsPanelProps {
  brandId: string;
  workspaceId: string;
  brandName?: string;
}

interface PlatformConfig {
  platform: SocialPlatform;
  name: string;
  accountTypeLabel: string;
  icon: React.ReactNode;
  color: string;
  badgeColor: string;
}

const PLATFORMS_CONFIG: PlatformConfig[] = [
  {
    platform: 'instagram',
    name: 'Instagram Business',
    accountTypeLabel: 'Cuenta Profesional / Creator',
    icon: <Instagram className="w-4 h-4" />,
    color: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  },
  {
    platform: 'facebook',
    name: 'Facebook Page',
    accountTypeLabel: 'Página de Facebook',
    icon: <Facebook className="w-4 h-4" />,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  {
    platform: 'tiktok',
    name: 'TikTok Video',
    accountTypeLabel: 'Cuenta Creator / Business',
    icon: <Video className="w-4 h-4" />,
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  },
  {
    platform: 'youtube',
    name: 'YouTube Shorts',
    accountTypeLabel: 'Canal de YouTube',
    icon: <Youtube className="w-4 h-4" />,
    color: 'text-red-400 bg-red-500/10 border-red-500/30',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
  },
  {
    platform: 'linkedin',
    name: 'LinkedIn Company',
    accountTypeLabel: 'Página de Organización',
    icon: <Linkedin className="w-4 h-4" />,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
];

export function SocialConnectionsPanel({
  brandId,
  workspaceId,
  brandName = 'Mi Marca',
}: SocialConnectionsPanelProps) {
  const { toast } = useToast();
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [unassignedAccounts, setUnassignedAccounts] = useState<SocialConnection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDiscoveringSocialit, setIsDiscoveringSocialit] = useState<boolean>(false);
  const [isSyncingN8n, setIsSyncingN8n] = useState<boolean>(false);
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState<string>(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('aurasocial_n8n_sync_webhook_url') : null) || '';
  });
  const [isEditingWebhookUrl, setIsEditingWebhookUrl] = useState<boolean>(false);
  const [activeActionPlatform, setActiveActionPlatform] = useState<SocialPlatform | null>(null);
  const [busyConnectionId, setBusyConnectionId] = useState<string | null>(null);

  // Socialit Provider Health state
  const [socialitHealth, setSocialitHealth] = useState<{
    status: 'configured' | 'configuration_warning' | 'invalid_credentials' | 'api_unavailable' | 'not_configured';
    is_valid: boolean;
    message: string;
    checked_at: string;
  } | null>(null);

  // Discovery Modal state
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState<boolean>(false);
  const [discoveredAccounts, setDiscoveredAccounts] = useState<DiscoveredSocialAccount[]>([]);
  const [isSavingAccounts, setIsSavingAccounts] = useState<boolean>(false);

  // Diagnostic report state
  const [healthReports, setHealthReports] = useState<Record<string, SocialAccountDiagnosticReport>>({});

  const checkSocialitStatus = useCallback(async () => {
    try {
      const report = await socialitProvider.validateSocialitConfiguration();
      setSocialitHealth(report);
    } catch (e) {
      console.error('Error al validar Socialit:', e);
    }
  }, []);

  const loadConnections = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setIsLoading(true);
      const { bound, unassigned } = await getBrandAndUnassignedSocialAccounts({
        workspaceId,
        brandId,
      });
      setConnections(bound);
      setUnassignedAccounts(unassigned);
    } catch (err) {
      console.error('Error al cargar conexiones:', err);
      // Fallback
      if (brandId) {
        const conns = await getSocialConnections(brandId, workspaceId);
        setConnections(conns);
      }
    } finally {
      setIsLoading(false);
    }
  }, [brandId, workspaceId]);

  useEffect(() => {
    loadConnections();
    checkSocialitStatus();
  }, [loadConnections, checkSocialitStatus]);

  const handleSyncWithN8nWorkflow = async () => {
    try {
      setIsSyncingN8n(true);
      const targetUrl = n8nWebhookUrl.trim() || undefined;
      const result = await n8nOrchestratorService.triggerSocialSyncWorkflow({
        workspaceId,
        brandId,
        provider: 'socialit',
        customWebhookUrl: targetUrl,
      });

      if (!result.success && result.error) {
        toast(`Error en orquestación n8n: ${result.error}`, { type: 'error' });
      } else {
        toast(`🟢 Sincronización n8n exitosa: ${result.accounts_processed} cuenta(s) vinculadas con "AuraSocial - Sync Socialit Accounts"`, { type: 'success' });
      }
      await loadConnections();
      await checkSocialitStatus();
    } catch (err: any) {
      toast(`Error al invocar n8n: ${err.message}`, { type: 'error' });
    } finally {
      setIsSyncingN8n(false);
    }
  };

  const handleDiscoverSocialitAccounts = async () => {
    try {
      setIsDiscoveringSocialit(true);
      const result = await discoverAndSyncSocialitAccounts({
        workspaceId,
        brandId,
        bindToBrand: false, // Descubrir y permitir asignación controlada
      });

      if (result.discovered.length === 0) {
        toast('Socialit configurado. Conectá una cuenta social desde el panel de Socialit y volvé a intentar.', { type: 'info' });
      } else {
        toast(`🟢 Descubrimiento exitoso: ${result.discovered.length} cuenta(s) encontradas en Socialit.`, { type: 'success' });
      }
      await loadConnections();
      await checkSocialitStatus();
    } catch (err: any) {
      toast(`Error al descubrir cuentas en Socialit: ${err.message}`, { type: 'error' });
    } finally {
      setIsDiscoveringSocialit(false);
    }
  };

  const handleBindAccount = async (connectionId: string) => {
    try {
      setBusyConnectionId(connectionId);
      await bindSocialAccount({
        connectionId,
        workspaceId,
        brandId,
      });
      toast(`Cuenta asociada con éxito a la marca ${brandName}`, { type: 'success' });
      await loadConnections();
    } catch (err: any) {
      toast(`Error al asociar cuenta: ${err.message}`, { type: 'error' });
    } finally {
      setBusyConnectionId(null);
    }
  };

  const handleUnbindAccount = async (connection: SocialConnection) => {
    if (!confirm(`¿Desvincular la cuenta ${connection.account_name} de la marca ${brandName}? Quedará disponible en el workspace como no asignada.`)) {
      return;
    }
    try {
      setBusyConnectionId(connection.id);
      await unbindSocialAccount({
        connectionId: connection.id,
        workspaceId,
        currentBrandId: brandId,
      });
      toast('Cuenta desvinculada de la marca.', { type: 'info' });
      await loadConnections();
    } catch (err: any) {
      toast(`Error al desvincular: ${err.message}`, { type: 'error' });
    } finally {
      setBusyConnectionId(null);
    }
  };

  const handleStartConnect = async (platform: SocialPlatform) => {
    try {
      setActiveActionPlatform(platform);
      const redirectUri = window.location.origin + '/oauth/callback';
      
      const { state } = await startOAuthFlow({
        platform,
        workspaceId,
        brandId,
        redirectUri,
      });

      const accounts = await handleOAuthCallback({
        platform,
        code: `mock_auth_code_${platform}_${Date.now()}`,
        state,
        redirectUri,
      });

      setDiscoveredAccounts(accounts);
      setIsDiscoveryOpen(true);
    } catch (err: any) {
      toast(`Error al iniciar conexión con ${platform}: ${err.message}`, { type: 'error' });
    } finally {
      setActiveActionPlatform(null);
    }
  };

  const handleConfirmDiscoveredAccounts = async (selected: DiscoveredSocialAccount[]) => {
    try {
      setIsSavingAccounts(true);
      for (const acc of selected) {
        await connectDiscoveredAccount({
          workspaceId,
          brandId,
          account: acc,
        });
      }
      toast(`¡${selected.length} cuenta(s) conectada(s) con éxito!`, { type: 'success' });
      setIsDiscoveryOpen(false);
      await loadConnections();
    } catch (err: any) {
      toast(`Error al vincular cuentas: ${err.message}`, { type: 'error' });
    } finally {
      setIsSavingAccounts(false);
    }
  };

  const handleDisconnect = async (connection: SocialConnection) => {
    if (!confirm(`¿Estás seguro de desconectar la cuenta ${connection.account_name}? Las publicaciones previas se conservarán.`)) {
      return;
    }
    try {
      setActiveActionPlatform(connection.platform);
      await disconnectSocialConnection(connection.id, connection.platform);
      toast(`Cuenta de ${connection.platform} desconectada`, { type: 'info' });
      await loadConnections();
    } catch (err: any) {
      toast(`Error al desconectar: ${err.message}`, { type: 'error' });
    } finally {
      setActiveActionPlatform(null);
    }
  };

  const handleCheckHealth = async (connection: SocialConnection) => {
    try {
      setBusyConnectionId(connection.id);
      const report = await diagnoseSocialConnectionHealth(connection.id);
      setHealthReports((prev) => ({ ...prev, [connection.id]: report }));
      if (report.is_valid) {
        toast(`Conexión saludable: token válido${report.days_until_expiration ? ` por ${report.days_until_expiration} días` : ''}`, { type: 'success' });
      } else {
        toast(`Atención: ${report.issues.join(' | ') || 'Problema de validación'}`, { type: 'info' });
      }
      await loadConnections();
    } catch (err: any) {
      toast(`Error al verificar salud: ${err.message}`, { type: 'error' });
    } finally {
      setBusyConnectionId(null);
    }
  };

  const handleRefreshToken = async (connection: SocialConnection) => {
    try {
      setActiveActionPlatform(connection.platform);
      await refreshSocialConnectionToken(connection.id, connection.platform);
      toast(`¡Token renovado con éxito para ${connection.platform}!`, { type: 'success' });
      await loadConnections();
    } catch (err: any) {
      toast(`Error al renovar token: ${err.message}`, { type: 'error' });
    } finally {
      setActiveActionPlatform(null);
    }
  };

  const hasRealConnections = connections.some(c => c.status === 'connected' && c.provider === 'socialit');

  return (
    <div className="space-y-6">
      {/* Provider Status & Hub Banner */}
      <div className="p-5 rounded-2xl bg-zinc-950/90 border border-zinc-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Socialit Connection Engine</h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  🥇 PRIMARY PROVIDER
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Canales sociales gestionados para la marca activa <strong className="text-zinc-200 font-semibold">{brandName}</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSyncWithN8nWorkflow}
              isLoading={isSyncingN8n}
              className="text-xs bg-purple-600 hover:bg-purple-500 text-white gap-1.5 shadow-md shadow-purple-600/20"
              title="Orquestar descubrimiento y binding mediante el workflow de n8n 'AuraSocial - Sync Socialit Accounts'"
            >
              <Zap className="w-3.5 h-3.5" />
              Sincronizar vía n8n (AuraSocial - Sync Socialit Accounts)
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleDiscoverSocialitAccounts}
              isLoading={isDiscoveringSocialit}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <Globe2 className="w-3.5 h-3.5" />
              Descubrir Directo
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => { loadConnections(); checkSocialitStatus(); }}
              isLoading={isLoading}
              className="text-xs text-zinc-400 hover:text-white gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-medium">Estado Socialit:</span>
            {socialitHealth?.status === 'configured' || hasRealConnections ? (
              <span className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                🟢 API Connected
              </span>
            ) : socialitHealth?.status === 'not_configured' ? (
              <span className="inline-flex items-center gap-1 font-mono font-semibold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                ⚪ No configurado
              </span>
            ) : socialitHealth?.status === 'invalid_credentials' ? (
              <span className="inline-flex items-center gap-1 font-mono font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                <XCircle className="w-3.5 h-3.5" />
                🔴 Credenciales Inválidas
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-mono font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                <AlertCircle className="w-3.5 h-3.5" />
                🟡 Socialit configurado — Conectá una cuenta social desde Socialit
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-[11px] text-zinc-400 font-mono">
            <span>Publicación Real: <strong className="text-rose-400">DESACTIVADA (Kill Switch)</strong></span>
            {socialitHealth?.checked_at && (
              <span>Validado: {new Date(socialitHealth.checked_at).toLocaleTimeString()}</span>
            )}
          </div>
        </div>

        {/* Target n8n Webhook Configuration */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs p-3 rounded-xl bg-purple-950/20 border border-purple-900/30">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Settings className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="font-semibold text-zinc-300 shrink-0">Target n8n Webhook:</span>
            {isEditingWebhookUrl ? (
              <input
                type="text"
                value={n8nWebhookUrl}
                onChange={(e) => setN8nWebhookUrl(e.target.value)}
                placeholder="https://tu-n8n.com/webhook/aurasocial/social/sync"
                className="bg-zinc-950 border border-purple-500/50 rounded px-2.5 py-1 text-white text-xs flex-1 max-w-lg focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
            ) : (
              <code className="text-purple-300 font-mono text-[11px] truncate bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/40">
                {n8nWebhookUrl || 'https://flow1.lsnetinformatica.com.ar/webhook/aurasocial/social/sync'}
              </code>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isEditingWebhookUrl ? (
              <>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('aurasocial_n8n_sync_webhook_url', n8nWebhookUrl.trim());
                    }
                    setIsEditingWebhookUrl(false);
                    toast('URL del Webhook de n8n guardada con éxito.', { type: 'success' });
                  }}
                  className="text-xs px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded font-semibold transition-colors"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setIsEditingWebhookUrl(false)}
                  className="text-xs px-2 py-1 text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditingWebhookUrl(true)}
                className="text-xs text-purple-400 hover:text-purple-300 underline font-medium"
              >
                {n8nWebhookUrl ? 'Cambiar URL de n8n' : 'Configurar URL de n8n'}
              </button>
            )}
          </div>
        </div>

        {/* User action guidance */}
        <div className="text-[11px] text-zinc-400 bg-indigo-950/20 border border-indigo-900/30 rounded-lg p-2.5 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Brand Binding & Isolation:</strong> Las cuentas vinculadas pertenecen estrictamente a la marca actual. Si descubriste cuentas en Socialit que aún no están asignadas, podés vincularlas abajo mediante <strong>[ Asociar a Brand ]</strong>.
          </span>
        </div>
      </div>

      {/* Active Brand Connections Grid */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <span>Canales de la Marca:</span>
          <span className="text-white font-bold">{brandName}</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORMS_CONFIG.map((cfg) => {
            const connection = connections.find(
              (c) => c.platform === cfg.platform && c.status !== 'disconnected'
            );
            const isConnected = Boolean(connection && (connection.status === 'connected' || connection.status === 'mock_connected'));
            const isMock = connection?.status === 'mock_connected' || connection?.metadata?.is_mock;
            const isExpired = connection?.status === 'expired' || connection?.metadata?.health_status === 'expired';
            const isExpiringSoon = connection?.metadata?.health_status === 'expiring_soon';
            const isRevoked = connection?.status === 'revoked' || connection?.metadata?.health_status === 'revoked';
            const isBusy = activeActionPlatform === cfg.platform || busyConnectionId === connection?.id;
            const diagnostic = connection ? healthReports[connection.id] : undefined;
            const canPublish = diagnostic ? diagnostic.can_publish : (connection?.metadata?.can_publish !== false);

            return (
              <div
                key={cfg.platform}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                  isConnected
                    ? 'bg-zinc-900/90 border-zinc-800 shadow-lg'
                    : 'bg-zinc-950/40 border-dashed border-zinc-800/80 opacity-85 hover:opacity-100'
                }`}
              >
                {/* Header Card */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${cfg.color}`}>
                        {cfg.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{cfg.name}</h4>
                        <span className="text-[10px] text-zinc-400 block">{cfg.accountTypeLabel}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col items-end gap-1">
                      <div>
                        {isConnected ? (
                          isMock ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                              <Sparkles className="w-3 h-3" />
                              🧪 Test Mock
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              <Clock className="w-3 h-3" />
                              🔴 Expired
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              <Clock className="w-3 h-3" />
                              🟡 Expiring Soon
                            </span>
                          ) : isRevoked ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                              <XCircle className="w-3 h-3" />
                              ⚫ Revoked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              🟢 Healthy
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                            ⚪ No conectado
                          </span>
                        )}
                      </div>
                      {/* Provider Tag */}
                      <span className="text-[9px] font-mono text-zinc-400">
                        via <strong className="text-zinc-300 font-semibold">{connection?.provider || 'socialit'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Account Details if connected */}
                  {isConnected && connection && (
                    <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Cuenta:</span>
                        <span className="text-zinc-200 font-semibold truncate max-w-[170px]" title={connection.account_name || ''}>
                          {connection.account_name || 'Sin nombre'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Usuario:</span>
                        <span className="text-indigo-300 font-mono">{connection.account_username || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500">Brand:</span>
                        <span className="text-zinc-300 font-semibold">{brandName}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500">Can publish:</span>
                        <span className={`font-mono font-bold ${canPublish ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {canPublish ? 'YES' : 'NO'}
                        </span>
                      </div>
                      {connection.token_expires_at && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-500">Expira en:</span>
                          <span className="text-zinc-400">
                            {new Date(connection.token_expires_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {diagnostic && diagnostic.issues.length > 0 && (
                        <div className="text-[11px] text-amber-400 flex items-start gap-1 pt-1">
                          <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          <span>{diagnostic.issues[0]}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                  {isConnected && connection ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleCheckHealth(connection)}
                          className="text-[11px] text-zinc-400 hover:text-white px-2"
                          title="Health Check (READ-ONLY)"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleRefreshToken(connection)}
                          className="text-[11px] text-zinc-400 hover:text-white px-2"
                          title="Renovar token"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleUnbindAccount(connection)}
                          className="text-[11px] text-zinc-400 hover:text-white px-2"
                          title="Desvincular de esta Brand"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <Button
                        variant="danger"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleDisconnect(connection)}
                        className="text-xs gap-1 py-1"
                      >
                        <PowerOff className="w-3 h-3" />
                        Desconectar
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isBusy}
                      isLoading={isBusy}
                      onClick={() => handleStartConnect(cfg.platform)}
                      className="w-full text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Conectar {cfg.name.split(' ')[0]}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unassigned Discovered Accounts Section */}
      {unassignedAccounts.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-800/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h4 className="text-sm font-bold text-amber-300">
                Cuentas descubiertas sin asignar ({unassignedAccounts.length})
              </h4>
            </div>
            <span className="text-xs text-amber-400/80">
              Disponibles para vincular a <strong>{brandName}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {unassignedAccounts.map((acc) => (
              <div
                key={acc.id}
                className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white uppercase text-[10px] tracking-wider px-1.5 py-0.5 rounded bg-zinc-800">
                      {acc.platform}
                    </span>
                    <span className="font-semibold text-zinc-200 truncate">{acc.account_name}</span>
                  </div>
                  <div className="text-zinc-400 text-[11px] font-mono">
                    {acc.account_username || acc.provider_account_id || '—'}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    Provider: <strong className="text-zinc-400">{acc.provider}</strong> | Brand: <strong className="text-amber-400">Sin asignar</strong>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  disabled={busyConnectionId === acc.id}
                  isLoading={busyConnectionId === acc.id}
                  onClick={() => handleBindAccount(acc.id)}
                  className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1 flex-shrink-0"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Asociar a Brand
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discovered Accounts Modal */}
      {isDiscoveryOpen && (
        <ConnectAccountModal
          isOpen={isDiscoveryOpen}
          onClose={() => setIsDiscoveryOpen(false)}
          onConfirm={handleConfirmDiscoveredAccounts}
          discoveredAccounts={discoveredAccounts}
          brandName={brandName}
          isSaving={isSavingAccounts}
        />
      )}
    </div>
  );
}
