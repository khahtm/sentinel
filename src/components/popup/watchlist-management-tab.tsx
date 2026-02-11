import { useState, useEffect } from 'react';
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from '../../lib/db/watchlist-crud-operations';
import type { WatchlistEntry } from '../../lib/db/dexie-sentinel-database';

/** Watchlist tab for managing watched wallet addresses */
export function WatchlistManagementTab() {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [newAddress, setNewAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    setLoading(true);
    const entries = await getWatchlist();
    setWatchlist(entries);
    setLoading(false);
  };

  const handleAdd = async () => {
    setError('');

    // Validate address format
    if (!newAddress.trim()) {
      setError('Address cannot be empty');
      return;
    }

    const addressLower = newAddress.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/i.test(addressLower)) {
      setError('Invalid wallet address format');
      return;
    }

    try {
      await addToWatchlist(addressLower as `0x${string}`);
      setNewAddress('');
      await loadWatchlist();
    } catch (err) {
      setError('Failed to add address');
      console.error('[Watchlist] Add error:', err);
    }
  };

  const handleRemove = async (walletAddress: `0x${string}`) => {
    try {
      await removeFromWatchlist(walletAddress);
      await loadWatchlist();
    } catch (err) {
      console.error('[Watchlist] Remove error:', err);
    }
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  const inputRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '8px 12px',
    fontSize: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontFamily: 'monospace',
  };

  const addButtonStyle: React.CSSProperties = {
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  };

  const errorStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#ef4444',
    marginTop: '-8px',
  };

  const listStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const entryStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
  };

  const addressStyle: React.CSSProperties = {
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#374151',
    wordBreak: 'break-all',
    flex: 1,
  };

  const removeButtonStyle: React.CSSProperties = {
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#ef4444',
    backgroundColor: 'transparent',
    border: '1px solid #ef4444',
    borderRadius: '4px',
    cursor: 'pointer',
  };

  const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '24px',
    fontSize: '13px',
    color: '#6b7280',
  };

  const skeletonStyle: React.CSSProperties = {
    height: '46px',
    backgroundColor: '#e5e7eb',
    borderRadius: '6px',
    animation: 'sentinelfi-pulse 1.5s infinite',
  };

  const truncateAddress = (addr: string): string => {
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
  };

  return (
    <>
      <style>{`
        @keyframes sentinelfi-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <div style={containerStyle}>
        <div style={inputRowStyle}>
          <input
            type="text"
            style={inputStyle}
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="0x... wallet address"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button style={addButtonStyle} onClick={handleAdd}>
            Add
          </button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <div style={listStyle}>
          {loading ? (
            <>
              <div style={skeletonStyle} />
              <div style={skeletonStyle} />
              <div style={skeletonStyle} />
            </>
          ) : watchlist.length === 0 ? (
            <div style={emptyStyle}>No watched addresses yet</div>
          ) : (
            watchlist.map((entry) => (
              <div key={entry.walletAddress} style={entryStyle}>
                <div
                  style={addressStyle}
                  title={entry.walletAddress}
                >
                  {truncateAddress(entry.walletAddress)}
                </div>
                <button
                  style={removeButtonStyle}
                  onClick={() => handleRemove(entry.walletAddress)}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
