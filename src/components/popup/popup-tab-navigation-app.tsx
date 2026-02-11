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
    backgroundColor: '#fff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
  };

  const tabBarStyle: React.CSSProperties = {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  };

  const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: isActive ? 700 : 500,
    color: isActive ? '#3b82f6' : '#6b7280',
    backgroundColor: isActive ? '#fff' : 'transparent',
    border: 'none',
    borderBottom: isActive ? '2px solid #3b82f6' : 'none',
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
