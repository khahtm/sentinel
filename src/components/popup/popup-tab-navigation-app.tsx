import { useState } from 'react';
import { DashboardStatsTab } from './dashboard-stats-tab';
import { SettingsConfigurationTab } from './settings-configuration-tab';
import { WatchlistManagementTab } from './watchlist-management-tab';

type TabId = 'dashboard' | 'settings' | 'watchlist';

/** Root popup component with tab navigation */
export function PopupTabNavigationApp() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const containerStyle: React.CSSProperties = {
    width: '360px',
    minHeight: '400px',
    backgroundColor: '#0d0d0d',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    color: '#e5e7eb',
  };

  const tabBarStyle: React.CSSProperties = {
    display: 'flex',
    borderBottom: '1px solid #1f2937',
    backgroundColor: '#111111',
  };

  const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: isActive ? 700 : 500,
    color: isActive ? '#34d399' : '#6b7280',
    backgroundColor: isActive ? '#0d0d0d' : 'transparent',
    border: 'none',
    borderBottom: isActive ? '2px solid #34d399' : 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  const contentStyle: React.CSSProperties = {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
  };

  return (
    <div style={containerStyle}>
      <div style={tabBarStyle}>
        <button
          style={tabButtonStyle(activeTab === 'dashboard')}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          style={tabButtonStyle(activeTab === 'settings')}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <button
          style={tabButtonStyle(activeTab === 'watchlist')}
          onClick={() => setActiveTab('watchlist')}
        >
          Watchlist
        </button>
      </div>

      <div style={contentStyle}>
        {activeTab === 'dashboard' && <DashboardStatsTab />}
        {activeTab === 'settings' && <SettingsConfigurationTab />}
        {activeTab === 'watchlist' && <WatchlistManagementTab />}
      </div>
    </div>
  );
}
