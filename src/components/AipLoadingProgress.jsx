import React, { useEffect, useState } from 'react';
import { aipLoadingProgress } from '../services/routes/aipLoadingProgress.js';

const AipLoadingProgress = () => {
  const [state, setState] = useState({ loading: false, files: {} });

  useEffect(() => {
    const handler = (e) => setState({ ...e.detail });
    aipLoadingProgress.addEventListener('progress', handler);
    return () => aipLoadingProgress.removeEventListener('progress', handler);
  }, []);

  if (!state.loading) return null;

  const files = Object.entries(state.files);
  if (!files.length) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: '#fff',
      padding: '12px',
      borderRadius: '6px',
      fontSize: '12px',
      zIndex: 9999,
      minWidth: '200px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Loading AIP Data...</div>
      {files.map(([name, { percent }]) => (
        <div key={name} style={{ marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{name}</span>
            <span>{percent}%</span>
          </div>
          <div style={{ background: '#333', height: '4px', borderRadius: '2px', marginTop: '2px' }}>
            <div style={{ background: '#4CAF50', height: '100%', width: `${percent}%`, borderRadius: '2px' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default AipLoadingProgress;
