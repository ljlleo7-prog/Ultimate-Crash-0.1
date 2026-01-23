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
  
  const isDraggingRef = React.useRef(Array(engineCount).fill(false));

  useEffect(() => {
    // Only update from props if not dragging
    if (isDraggingRef.current.some(d => d)) return;

    if (Array.isArray(flightState?.engineThrottles)) {
      // flightState.engineThrottles now contains commanded values (levers)
      // We need to inverse map them to slider positions (0-1)
      const values = flightState.engineThrottles.map(v => {
        // v is in -1 to 1 range (approx)
        const cmd = typeof v === 'number' ? v/100 : 0; // v is percent? 
        // useAircraftPhysics returns values * 100. So v/100 gives -1..1.
        
        // Inverse Map:
        // If cmd < 0: val = (cmd + 1) * 0.2
        // If cmd >= 0: val = (cmd * 0.8) + 0.2
        if (cmd < 0) return (cmd + 1) * 0.2;
        return (cmd * 0.8) + 0.2;
      });
      if (values.length === engineCount) {
        setThrottles(values);
        setReverse(values.map(v => v <= 0.2));
      }
    } else if (typeof flightState?.throttle === 'number') {
      const cmd = flightState.throttle / 100;
      let val;
      if (cmd < 0) val = (cmd + 1) * 0.2;
      else val = (cmd * 0.8) + 0.2;
      setThrottles(Array(engineCount).fill(val));
      setReverse(Array(engineCount).fill(val <= 0.2));
    }
  }, [flightState?.engineThrottles, flightState?.throttle, engineCount]);
  
  const mapLeverToCommand = (lever) => {
    const v = Math.max(0, Math.min(1, lever));
    const reverseSection = 0.2;
    
    if (v <= reverseSection) {
      // 0.0 -> -1.0 (Max Rev)
      // 0.2 -> 0.0 (Idle)
      // Formula: -1.0 + (v / 0.2)
      // v=0 -> -1.
      // v=0.2 -> 0.
      return -1.0 + (v / reverseSection);
    } else {
      // 0.2 -> 0.0 (Idle)
      // 1.0 -> 1.0 (TOGA)
      // Formula: (v - 0.2) / 0.8
      return (v - reverseSection) / (1 - reverseSection);
    }
  };

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

    // Update reverse state based on position
    setReverse(prev => {
      const next = [...prev];
      const isRev = val <= 0.2;
      next[index] = isRev;
      if (sync) {
        for (let i = 0; i < engineCount; i++) next[i] = isRev;
      }
      return next;
    });

    const cmd = mapLeverToCommand(val);
    if (controlThrust) controlThrust(index, cmd);
    
    if (sync) {
      for (let i = 0; i < engineCount; i++) {
        // For sync, we use the SAME lever value 'val'
        if (i !== index) {
            const cmdSync = mapLeverToCommand(val);
            if (controlThrust) controlThrust(i, cmdSync);
        }
      }
    }
  }, [controlThrust, sync, engineCount]);
  
  const onDrag = (index, e) => {
    isDraggingRef.current[index] = true;
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const startReverseState = reverse[index]; // Capture mode at start of drag
    
    const move = (evt) => {
      const y = (evt.touches ? evt.touches[0].clientY : evt.clientY) - rect.top;
      const pct = Math.max(0, Math.min(100, (1 - y / rect.height) * 100));
      const raw = pct / 100;
      
      // Clamp based on mode to prevent accidental crossover
      // Forward Mode: Cannot go below 0.2 (Idle)
      // Reverse Mode: Cannot go above 0.2 (Idle)
      let clamped = raw;
      if (!startReverseState) {
        // In Forward Mode: Lock to [0.201, 1.0]
        clamped = Math.max(0.201, raw);
      } else {
        // In Reverse Mode: Lock to [0.0, 0.2]
        clamped = Math.min(0.2, raw);
      }
      
      setLeverThrottle(index, clamped);
    };
    
    const up = () => {
      isDraggingRef.current[index] = false;
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
  
  // Toggle acts as the "Gate" between Forward and Reverse
  const toggleReverse = (index) => {
    const currentVal = throttles[index];
    const isInRev = currentVal <= 0.2;
    
    // Toggle Mode:
    // Rev -> Fwd: Go to Idle Forward (0.21)
    // Fwd -> Rev: Go to Idle Reverse (0.19) - Safe start, user can then drag to Max Rev
    const newVal = isInRev ? 0.21 : 0.19;
    
    setLeverThrottle(index, newVal);
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
