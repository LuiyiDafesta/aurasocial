import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useWorkspace } from './hooks/useWorkspace';
import { useSocialAccounts } from './hooks/useSocialAccounts';
import { useContentStats } from './hooks/useContentStats';
import { AuthPage } from './pages/AuthPage';
import { MainLayout } from './layouts/MainLayout';
import { NavigationTab } from './layouts/Sidebar';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ContenidosPage } from './pages/ContenidosPage';
import { LayoutDashboard, Lightbulb, Calendar, BarChart3, Loader2 } from 'lucide-react';

export default function App() {
  const { user, isLoading: isAuthLoading, signOut, isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('contenidos');

  // Hooks de datos reales desde Supabase
  const { 
    currentWorkspace, 
    currentBrand, 
    isLoading: isWorkspaceLoading 
  } = useWorkspace(isAuthenticated);

  const { 
    accounts: socialAccounts, 
    isLoading: isAccountsLoading 
  } = useSocialAccounts(currentWorkspace?.id, currentBrand?.id);

  const { 
    stats, 
    isLoading: isStatsLoading 
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
          <PlaceholderPage
            title="Dashboard General"
            description="Métricas globales de la marca, publicaciones recientes y estado del pipeline semanal de contenidos."
            icon={LayoutDashboard}
          />
        );
      case 'ideas':
        return (
          <PlaceholderPage
            title="Banco de Ideas (WF01)"
            description="Estrategia y conceptos semanales generados por la IA para su posterior producción en contenidos."
            icon={Lightbulb}
          />
        );
      case 'calendario':
        return (
          <PlaceholderPage
            title="Calendario Editorial"
            description="Visualización temporal de contenidos programados con zona horaria America/Argentina/Buenos_Aires."
            icon={Calendar}
          />
        );
      case 'analytics':
        return (
          <PlaceholderPage
            title="Módulo de Analytics (WF05 / WF06)"
            description="Recopilación de interacciones y análisis de aprendizaje continuo desde las redes sociales."
            icon={BarChart3}
          />
        );
      case 'contenidos':
      default:
        return (
          <ContenidosPage
            workspaceId={currentWorkspace?.id}
            brandId={currentBrand?.id}
          />
        );
    }
  };

  return (
    <MainLayout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      user={user}
      onSignOut={signOut}
      title={currentTab.charAt(0).toUpperCase() + currentTab.slice(1)}
      workspaceName={currentWorkspace?.name}
      brandName={currentBrand?.name}
      socialAccounts={socialAccounts}
      stats={stats}
      isStatsLoading={isStatsLoading}
      isAccountsLoading={isAccountsLoading}
    >
      {renderContent()}
    </MainLayout>
  );
}
