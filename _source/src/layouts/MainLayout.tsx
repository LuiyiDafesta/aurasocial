import React from 'react';
import { Sidebar, NavigationTab } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../components/common/ToastContainer';
import { User } from '@supabase/supabase-js';
import { SocialAccount } from '../types/socialAccount';
import { StatusCounts, Brand } from '../types/database';

interface MainLayoutProps {
  children: React.ReactNode;
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  user: User | null;
  onSignOut: () => void;
  title?: string;
  workspaceName?: string;
  brandName?: string;
  brands?: Brand[];
  currentBrand?: Brand | null;
  onSelectBrand?: (brandId: string) => void;
  onCreateBrand?: () => void;
  onEditBrand?: (brand: Brand) => void;
  isSwitchingBrand?: boolean;
  socialAccounts?: SocialAccount[];
  stats?: StatusCounts;
  isStatsLoading?: boolean;
  isAccountsLoading?: boolean;
}

export function MainLayout({
  children,
  currentTab,
  onSelectTab,
  user,
  onSignOut,
  title,
  workspaceName,
  brandName,
  brands = [],
  currentBrand = null,
  onSelectBrand,
  onCreateBrand,
  onEditBrand,
  isSwitchingBrand = false,
  socialAccounts = [],
  stats,
  isStatsLoading = false,
  isAccountsLoading = false,
}: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-dark-950 text-slate-100 overflow-hidden">
      {/* Sidebar con selector global de marcas */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        workspaceName={workspaceName}
        brandName={brandName}
        brands={brands}
        currentBrand={currentBrand}
        onSelectBrand={onSelectBrand}
        onCreateBrand={onCreateBrand}
        onEditBrand={onEditBrand}
        isSwitchingBrand={isSwitchingBrand}
        socialAccounts={socialAccounts}
        stats={stats}
        isStatsLoading={isStatsLoading}
        isAccountsLoading={isAccountsLoading}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header user={user} onSignOut={onSignOut} title={title} />
        
        <main className="flex-1 overflow-y-auto bg-dark-950/50">
          {children}
        </main>
      </div>

      {/* Global Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
