import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useWorkspace } from './hooks/useWorkspace';
import { useSocialAccounts } from './hooks/useSocialAccounts';
import { useContentStats } from './hooks/useContentStats';
import { AuthPage } from './pages/AuthPage';
import { MainLayout } from './layouts/MainLayout';
import { NavigationTab } from './layouts/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ContenidosPage } from './pages/ContenidosPage';
import { IdeasPage } from './pages/IdeasPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { AssetManagementStudio } from './components/assets/AssetManagementStudio';
import { BrandFormModal } from './components/brands/BrandFormModal';
import { Brand } from './types/database';
import { SocialConnectionsPanel } from './components/publishing/SocialConnectionsPanel';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { user, isLoading: isAuthLoading, signOut, isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');

  // Modal de edición / creación de marca global
  const [isBrandModalOpen, setIsBrandModalOpen] = useState<boolean>(false);
  const [brandToEdit, setBrandToEdit] = useState<Brand | null>(null);

  // Hooks de datos reales desde Supabase
  const { 
    currentWorkspace, 
    brands, 
    currentBrand, 
    isLoading: isWorkspaceLoading,
    isSwitchingBrand,
    selectBrand,
    refreshBrands,
  } = useWorkspace(isAuthenticated);

  const { 
    accounts: socialAccounts, 
    isLoading: isAccountsLoading,
    refreshAccounts: refreshSocialAccounts
  } = useSocialAccounts(currentWorkspace?.id, currentBrand?.id);

  const { 
    stats, 
    isLoading: isStatsLoading,
    refreshStats
  } = useContentStats(currentWorkspace?.id, currentBrand?.id);

  if (isAuthLoading || (isAuthenticated && isWorkspaceLoading)) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 text-aura-500 animate-spin mb-3" />
        <span className="text-xs font-medium tracking-wide text-slate-400">
          Cargando entorno de Aura Social...
        </span>
      </div>
    );
  }

  // Si no está autenticado, mostrar pantalla de login
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardPage
            currentBrand={currentBrand}
            stats={stats}
            socialAccounts={socialAccounts}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        );
      case 'campaigns':
        return (
          <CampaignsPage
            workspaceId={currentWorkspace?.id}
            brands={brands}
            currentBrand={currentBrand}
            onSelectBrand={selectBrand}
            onRefreshBrands={refreshBrands}
            onEditBrand={(b) => {
              setBrandToEdit(b);
              setIsBrandModalOpen(true);
            }}
            isSwitchingBrand={isSwitchingBrand}
          />
        );
      case 'ideas':
        return (
          <IdeasPage
            workspaceId={currentWorkspace?.id}
            brands={brands}
            currentBrand={currentBrand}
            onSelectBrand={selectBrand}
            onRefreshBrands={refreshBrands}
            onEditBrand={(b) => {
              setBrandToEdit(b);
              setIsBrandModalOpen(true);
            }}
            isSwitchingBrand={isSwitchingBrand}
          />
        );
      case 'assets':
        return currentWorkspace && currentBrand ? (
          <div className="p-8 max-w-7xl mx-auto space-y-6">
            <AssetManagementStudio
              workspaceId={currentWorkspace.id}
              brand={currentBrand}
            />
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400">Selecciona una marca para ver sus archivos</div>
        );
      case 'settings':
        return (
          <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Configuración & Canales Sociales</h1>
              <p className="text-sm text-slate-400 mt-1">
                Administrá la integración con Socialit, la vinculación a marcas y la orquestación directa con n8n.
              </p>
            </div>
            {currentWorkspace && (
              <SocialConnectionsPanel
                brandId={currentBrand?.id || ''}
                workspaceId={currentWorkspace.id}
                brandName={currentBrand?.name || 'Marca Activa'}
                onAccountsChanged={refreshSocialAccounts}
              />
            )}
          </div>
        );
      case 'contenidos':
      default:
        return (
          <ContenidosPage
            workspaceId={currentWorkspace?.id}
            brandId={currentBrand?.id}
            onContentMutated={refreshStats}
          />
        );
    }
  };

  return (
    <>
      <MainLayout
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        user={user}
        onSignOut={signOut}
        title={
          currentTab === 'dashboard' ? 'Inicio' :
          currentTab === 'ideas' ? 'Ideas' :
          currentTab === 'contenidos' ? 'Contenidos' :
          currentTab === 'campaigns' ? 'Campañas' :
          currentTab === 'assets' ? 'Biblioteca Media' :
          'Configuración'
        }
        workspaceName={currentWorkspace?.name}
        brandName={currentBrand?.name}
        brands={brands}
        currentBrand={currentBrand}
        onSelectBrand={selectBrand}
        onCreateBrand={() => {
          setBrandToEdit(null);
          setIsBrandModalOpen(true);
        }}
        onEditBrand={(b) => {
          setBrandToEdit(b);
          setIsBrandModalOpen(true);
        }}
        isSwitchingBrand={isSwitchingBrand}
        socialAccounts={socialAccounts}
        stats={stats}
        isStatsLoading={isStatsLoading}
        isAccountsLoading={isAccountsLoading}
      >
        {renderContent()}
      </MainLayout>

      {/* Modal global para crear / editar Marca */}
      {isBrandModalOpen && currentWorkspace && (
        <BrandFormModal
          isOpen={isBrandModalOpen}
          onClose={() => setIsBrandModalOpen(false)}
          workspaceId={currentWorkspace.id}
          brandToEdit={brandToEdit}
          onSaved={() => {
            setIsBrandModalOpen(false);
            refreshBrands();
          }}
        />
      )}
    </>
  );
}
