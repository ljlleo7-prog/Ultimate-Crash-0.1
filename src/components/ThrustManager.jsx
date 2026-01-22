import React, { useState, useEffect, useCallback } from 'react';

const ThrustManager = ({ controlThrust, flightState }) => {
  const engineCount =
    Array.isArray(flightState?.engineN1) ? flightState.engineN1.length :
    Array.isArray(flightState?.engineN2) ? flightState.engineN2.length : 2;
  
  const initial = Array(engineCount).fill(0.2);
  const [throttles, setThrottles] = useState(initial);
  const [reverse, setReverse] = useState(Array(engineCount).fill(false));
  const [sync, setSync] = useState(true);
  const displayThrottles = throttles.map(t => t * 100);
  
  useEffect(() => {
    if (Array.isArray(flightState?.engineThrottles)) {
      const values = flightState.engineThrottles.map(v => (typeof v === 'number' ? v/100 : 0.2));
      if (values.length === engineCount) {
        setThrottles(values);
      }
    } else if (typeof flightState?.throttle === 'number') {
      const t = flightState.throttle / 100;
      setThrottles(Array(engineCount).fill(t));
    }
  }, [flightState?.engineThrottles, flightState?.throttle, engineCount]);
  
  const setLeverThrottle = useCallback((index, value) => {
    const val = Math.max(0, Math.min(1, value));
    setThrottles(prev => {
      const next = [...prev];
      next[index] = val;
      if (sync) {
        for (let i = 0; i < engineCount; i++) next[i] = val;
      }
      return next;
    });
    const mapLeverToCommand = (lever, isRev) => {
      const v = Math.max(0, Math.min(1, lever));
      const reverseSection = 0.2;
      const forwardStart = reverseSection;
      const forwardSpan = 1 - reverseSection;
      if (!isRev) {
        if (v <= reverseSection) return 0;
        const norm = (v - forwardStart) / forwardSpan;
        return norm;
      }
      if (v <= reverseSection) {
        const frac = 1 - v / reverseSection;
        return -0.7 * frac;
      }
      return 0;
    };
    const baseCommand = mapLeverToCommand(val, reverse[index]);
    if (controlThrust) controlThrust(index, baseCommand);
    if (sync) {
      for (let i = 0; i < engineCount; i++) {
        const cmd = mapLeverToCommand(val, reverse[i]);
        if (controlThrust) controlThrust(i, cmd);
      }
    }
  }, [controlThrust, reverse, sync, engineCount]);
  
  const onDrag = (index, e) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const move = (evt) => {
      const y = (evt.touches ? evt.touches[0].clientY : evt.clientY) - rect.top;
      const pct = Math.max(0, Math.min(100, (1 - y / rect.height) * 100));
      const raw = pct / 100;
      const reverseSection = 0.2;
      const isRev = reverse[index];
      const clamped = isRev
        ? Math.max(0, Math.min(reverseSection, raw))
        : Math.max(reverseSection, Math.min(1, raw));
      setLeverThrottle(index, clamped);
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);
    move(e);
  };
  
  const toggleReverse = (index) => {
    const wasRev = reverse[index];
    const newValue = !wasRev;
    const nextReverse = sync ? Array(engineCount).fill(newValue) : [...reverse];
    if (!sync) {
      nextReverse[index] = newValue;
    }
    const reverseSection = 0.2;
    const nextThrottles = [...throttles];
    for (let i = 0; i < engineCount; i++) {
      const current = nextThrottles[i];
      if (nextReverse[i]) {
        nextThrottles[i] = Math.max(0, Math.min(reverseSection, current));
      } else {
        nextThrottles[i] = Math.max(reverseSection, Math.min(1, current));
      }
    }
    setReverse(nextReverse);
    setThrottles(nextThrottles);
    const mapLeverToCommand = (lever, isRev) => {
      const v = Math.max(0, Math.min(1, lever));
      const reverseSection = 0.2;
      const forwardStart = reverseSection;
      const forwardSpan = 1 - reverseSection;
      if (!isRev) {
        if (v <= reverseSection) return 0;
        const norm = (v - forwardStart) / forwardSpan;
        return norm;
      }
      if (v <= reverseSection) {
        const frac = 1 - v / reverseSection;
        return -0.7 * frac;
      }
      return 0;
    };
    for (let i = 0; i < engineCount; i++) {
      const lever = nextThrottles[i];
      const isRev = nextReverse[i];
      const cmd = mapLeverToCommand(lever, isRev);
      if (controlThrust) controlThrust(i, cmd);
    }
  };
  
  const lever = (index) => {
    const n1 = Array.isArray(flightState?.engineN1) ? flightState.engineN1[index] : flightState?.engineN1 || 22;
    const n2 = Array.isArray(flightState?.engineN2) ? flightState.engineN2[index] : flightState?.engineN2 || 45;
    const egt = Array.isArray(flightState?.engineEGT) ? flightState.engineEGT[index] : flightState?.engineEGT || 400;
    const pct = displayThrottles[index];
    const isRev = reverse[index];
    
    return React.createElement('div', {
      key: index,
      style: {
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '8px',
        borderRadius: '8px',
        border: '1px solid #475569',
        width: '80px'
      }
    },
      React.createElement('div', { style: { textAlign: 'center', marginBottom: '6px', color: '#00ff00', fontFamily: 'monospace', fontSize: '10px' } }, `ENG ${index+1}`),
      React.createElement('div', {
        style: {
          position: 'relative',
          height: '120px',
          width: '25px',
          background: '#2a2a2a',
          borderRadius: '12px',
          margin: '6px auto',
          border: '1px solid #555',
          cursor: 'grab',
          userSelect: 'none'
        },
        onMouseDown: (e) => onDrag(index, e),
        onTouchStart: (e) => onDrag(index, e)
      },
        React.createElement('div', { style: { position: 'absolute', top: '4px', left: '4px', right: '4px', bottom: '4px', background: 'linear-gradient(to top, #ff4444 0%, #ffaa00 50%, #00ff00 100%)', borderRadius: '8px', opacity: 0.25 } }),
        React.createElement('div', { style: { position: 'absolute', bottom: `${pct}%`, left: '2px', right: '2px', height: '14px', background: 'linear-gradient(to top, #ff4444, #ffaa00, #00ff00)', borderRadius: '8px', boxShadow: '0 0 4px rgba(0,255,0,0.7)' } }),
        React.createElement('div', { style: { position: 'absolute', bottom: `${pct}%`, left: '-5px', width: '35px', height: '14px', background: '#fff', border: '1px solid #000', borderRadius: '8px', transform: 'translateY(50%)', fontSize: '8px', fontWeight: 'bold', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, isRev ? 'REV' : 'THR')
      ),
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '4px', marginTop: '4px' } },
        React.createElement('div', { style: { width: '100%', height: '14px', background: isRev ? '#ef4444' : '#10b981', color: '#fff', borderRadius: '4px', textAlign: 'center', lineHeight: '14px', fontSize: '8px', cursor: 'pointer' }, onClick: () => toggleReverse(index) }, isRev ? 'REV' : 'FWD')
      ),
      React.createElement('div', { style: { marginTop: '6px', background: '#0a0a0a', borderRadius: '4px', border: '1px solid #333', padding: '4px' } },
        React.createElement('div', { style: { fontSize: '8px', color: '#888', marginBottom: '2px', textAlign: 'center' } }, 'ENG'),
        React.createElement('div', { style: { fontSize: '8px', fontFamily: 'monospace', textAlign: 'center' } },
          React.createElement('div', { style: { color: '#00ff00' } }, `N1: ${(n1 || 0).toFixed(0)}%`),
          React.createElement('div', { style: { color: '#00ff00' } }, `N2: ${(n2 || 0).toFixed(0)}%`),
          React.createElement('div', { style: { color: '#ffaa00' } }, `EGT: ${(egt || 0).toFixed(0)}°C`),
          isRev && React.createElement('div', { style: { color: '#ef4444', fontWeight: 'bold' } }, 'REV')
        )
      )
    );
  };
  
  return React.createElement('div', { style: { background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', padding: '15px', borderRadius: '10px', border: '2px solid #475569', display: 'flex', gap: '10px', alignItems: 'flex-start', width: 'fit-content', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)' } },
    React.createElement('div', { style: { display: 'flex', gap: '10px' } },
      Array.from({ length: engineCount }).map((_, i) => lever(i))
    ),
      React.createElement('div', { style: { marginLeft: '8px' } },
        React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#ccc' } },
          React.createElement('input', {
            type: 'checkbox',
            checked: sync,
            onChange: (e) => {
              const checked = e.target.checked;
              setSync(checked);
              if (checked) {
                const firstRev = reverse[0] || false;
                setReverse(Array(engineCount).fill(firstRev));
              }
            }
          }),
          'Sync'
        )
      )
  );

};

export default ThrustManager;
