import React from 'react';

export default function MultiplayerTrafficPanel({ status, remoteTraffic }) {
  const remoteCount = remoteTraffic?.length || 0;

  return (
    <div
      style={{
        minWidth: '240px',
        maxWidth: '320px',
        padding: '10px 12px',
        borderRadius: '8px',
        background: 'rgba(15, 23, 42, 0.82)',
        border: '1px solid rgba(59, 130, 246, 0.35)',
        color: '#E5E7EB'
      }}
    >
      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#93C5FD', marginBottom: '6px' }}>
        Multiplayer Traffic
      </div>

      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
        {status?.label || 'Offline'}
      </div>

      <div style={{ fontSize: '12px', color: '#CBD5E1', marginBottom: remoteCount > 0 ? '8px' : 0 }}>
        {status?.detail || 'Supabase auth and namespace session required.'}
      </div>

      {remoteCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
          {remoteTraffic.slice(0, 4).map((traffic) => (
            <div
              key={traffic.userId}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '4px 10px',
                fontSize: '11px',
                padding: '6px 8px',
                borderRadius: '6px',
                background: 'rgba(30, 41, 59, 0.7)'
              }}
            >
              <div style={{ fontWeight: 600 }}>{traffic.callsign || traffic.userId}</div>
              <div style={{ color: '#93C5FD' }}>{traffic.role || 'pilot'}</div>
              <div>HDG {Math.round(traffic.heading || 0)}°</div>
              <div>{Math.round(traffic.altitudeFt || 0)} ft</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
