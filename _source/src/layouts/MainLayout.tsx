import React from 'react';
import { Sidebar, NavigationTab } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../components/common/ToastContainer';
import { User } from '@supabase/supabase-js';
import { SocialAccount } from '../types/socialAccount';
import { StatusCounts } from '../types/database';

interface MainLayoutProps {
  children: React.ReactNode;
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  user: User | null;
  onSignOut: () => void;
  title?: string;
  workspaceName?: string;
  brandName?: string;
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
  socialAccounts = [],
  stats,
  isStatsLoading = false,
  isAccountsLoading = false,
}: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-dark-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        workspaceName={workspaceName}
        brandName={brandName}
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
