import { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../../lib/constants';

interface SettingsState {
  alchemyApiKey: string;
  enableCreatorDumpAlert: boolean;
  enableWhaleExitAlert: boolean;
}

/** Settings tab for API key and alert configuration */
export function SettingsConfigurationTab() {
  const [settings, setSettings] = useState<SettingsState>({
    alchemyApiKey: '',
    enableCreatorDumpAlert: true,
    enableWhaleExitAlert: true,
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const result = await chrome.storage.local.get([
        STORAGE_KEYS.alchemyApiKey,
        'enable_creator_dump_alert',
        'enable_whale_exit_alert',
      ]);

      setSettings({
        alchemyApiKey: (result[STORAGE_KEYS.alchemyApiKey] as string) || '',
        enableCreatorDumpAlert: (result.enable_creator_dump_alert as boolean) ?? true,
        enableWhaleExitAlert: (result.enable_whale_exit_alert as boolean) ?? true,
      });
    } catch (error) {
      console.error('[Settings] Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.alchemyApiKey]: settings.alchemyApiKey,
        enable_creator_dump_alert: settings.enableCreatorDumpAlert,
        enable_whale_exit_alert: settings.enableWhaleExitAlert,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('[Settings] Failed to save settings:', error);
    }
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  };

  const fieldGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: '#d1d5db',
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: '13px',
    border: '1px solid #2a2a2a',
    borderRadius: '6px',
    fontFamily: 'monospace',
    backgroundColor: '#1a1a1a',
    color: '#f3f4f6',
  };

  const checkboxRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const checkboxStyle: React.CSSProperties = {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  };

  const checkboxLabelStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#d1d5db',
    cursor: 'pointer',
  };

  const saveButtonStyle: React.CSSProperties = {
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#0d0d0d',
    backgroundColor: saved ? '#22c55e' : '#34d399',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '8px',
  };

  const skeletonStyle: React.CSSProperties = {
    height: '36px',
    backgroundColor: '#2a2a2a',
    borderRadius: '6px',
    animation: 'sentinelfi-pulse 1.5s infinite',
  };

  if (loading) {
    return (
      <>
        <style>{`
          @keyframes sentinelfi-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
        <div style={containerStyle}>
          <div style={skeletonStyle} />
          <div style={skeletonStyle} />
          <div style={skeletonStyle} />
        </div>
      </>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Alchemy API Key</label>
        <input
          type="password"
          style={inputStyle}
          value={settings.alchemyApiKey}
          onChange={(e) =>
            setSettings({ ...settings, alchemyApiKey: e.target.value })
          }
          placeholder="Enter your Alchemy API key"
        />
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Alert Preferences</label>

        <div style={checkboxRowStyle}>
          <input
            type="checkbox"
            id="creator-dump"
            style={checkboxStyle}
            checked={settings.enableCreatorDumpAlert}
            onChange={(e) =>
              setSettings({
                ...settings,
                enableCreatorDumpAlert: e.target.checked,
              })
            }
          />
          <label htmlFor="creator-dump" style={checkboxLabelStyle}>
            Creator Dump Alert
          </label>
        </div>

        <div style={checkboxRowStyle}>
          <input
            type="checkbox"
            id="whale-exit"
            style={checkboxStyle}
            checked={settings.enableWhaleExitAlert}
            onChange={(e) =>
              setSettings({
                ...settings,
                enableWhaleExitAlert: e.target.checked,
              })
            }
          />
          <label htmlFor="whale-exit" style={checkboxLabelStyle}>
            Whale Exit Alert
          </label>
        </div>
      </div>

      <button style={saveButtonStyle} onClick={saveSettings}>
        {saved ? '✓ Saved' : 'Save Settings'}
      </button>
    </div>
  );
}
