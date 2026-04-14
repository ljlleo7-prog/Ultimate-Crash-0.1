import React, { useState, useEffect, useCallback, useRef } from 'react';

const REVERSE_IDLE_LEVER = 0.19;
const FORWARD_IDLE_LEVER = 0.21;
const REVERSE_DETENT = 0.2;
const MODE_HYSTERESIS = 0.015;
const REVERSE_SYNC_THRESHOLD = -0.05;
const FORWARD_SYNC_THRESHOLD = 0.02;
const MANUAL_SYNC_LOCK_MS = 1200;

const ThrustManager = ({ controlThrust, flightState }) => {
  const engineCount =
    Array.isArray(flightState?.engineN1) ? flightState.engineN1.length :
    Array.isArray(flightState?.engineN2) ? flightState.engineN2.length : 2;

  const initial = Array(engineCount).fill(REVERSE_DETENT);
  const [throttles, setThrottles] = useState(initial);
  const [reverse, setReverse] = useState(Array(engineCount).fill(false));
  const [sync, setSync] = useState(true);
  const displayThrottles = throttles.map(t => t * 100);

  const isDraggingRef = useRef(Array(engineCount).fill(false));
  const lastManualThrottleChangeRef = useRef(0);
  const reverseRef = useRef(reverse);

  useEffect(() => {
    reverseRef.current = reverse;
  }, [reverse]);

  useEffect(() => {
    isDraggingRef.current = Array(engineCount).fill(false);
  }, [engineCount]);

  const deriveReverseFromLever = useCallback((lever, previousMode = false) => {
    if (lever < REVERSE_DETENT - MODE_HYSTERESIS) return true;
    if (lever > REVERSE_DETENT + MODE_HYSTERESIS) return false;
    return previousMode;
  }, []);

  const deriveReverseFromCommand = useCallback((command, previousMode = false) => {
    if (command <= REVERSE_SYNC_THRESHOLD) return true;
    if (command >= FORWARD_SYNC_THRESHOLD) return false;
    return previousMode;
  }, []);

  const mapCommandToLever = useCallback((command) => {
    const cmd = typeof command === 'number' ? command : 0;
    if (cmd < 0) return (cmd + 1) * REVERSE_DETENT;
    return (cmd * (1 - REVERSE_DETENT)) + REVERSE_DETENT;
  }, []);

  useEffect(() => {
    if (isDraggingRef.current.some(d => d)) return;
    if (Date.now() - lastManualThrottleChangeRef.current < MANUAL_SYNC_LOCK_MS) return;

    if (Array.isArray(flightState?.engineThrottles)) {
      const commands = flightState.engineThrottles.map(v => (typeof v === 'number' ? v : 0));
      const values = commands.map(mapCommandToLever);
      if (values.length === engineCount) {
        const nextReverse = values.map((_, index) => deriveReverseFromCommand(commands[index], reverseRef.current[index] ?? false));
        const throttlesChanged = values.some((value, index) => Math.abs((throttles[index] ?? 0) - value) > 0.0001);
        const reverseChanged = nextReverse.some((value, index) => (reverseRef.current[index] ?? false) !== value);

        if (throttlesChanged) {
          setThrottles(values);
        }
        if (reverseChanged) {
          reverseRef.current = nextReverse;
          setReverse(nextReverse);
        }
      }
    } else if (typeof flightState?.throttle === 'number') {
      const command = flightState.throttle;
      const val = mapCommandToLever(command);
      const nextMode = deriveReverseFromCommand(command, reverseRef.current[0] ?? false);
      const nextReverse = Array(engineCount).fill(nextMode);
      const nextThrottles = Array(engineCount).fill(val);
      const throttlesChanged = nextThrottles.some((value, index) => Math.abs((throttles[index] ?? 0) - value) > 0.0001);
      const reverseChanged = nextReverse.some((value, index) => (reverseRef.current[index] ?? false) !== value);

      if (throttlesChanged) {
        setThrottles(nextThrottles);
      }
      if (reverseChanged) {
        reverseRef.current = nextReverse;
        setReverse(nextReverse);
      }
    }
  }, [flightState?.engineThrottles, flightState?.throttle, engineCount, deriveReverseFromCommand, mapCommandToLever, throttles]);

  const mapLeverToCommand = (lever) => {
    const v = Math.max(0, Math.min(1, lever));

    if (v <= REVERSE_DETENT) {
      return -1.0 + (v / REVERSE_DETENT);
    }

    return (v - REVERSE_DETENT) / (1 - REVERSE_DETENT);
  };

  const setLeverThrottle = useCallback((index, value, options = {}) => {
    const val = Math.max(0, Math.min(1, value));
    const { forcedReverse = null } = options;
    lastManualThrottleChangeRef.current = Date.now();

    setThrottles(prev => {
      const next = [...prev];
      next[index] = val;
      if (sync) {
        for (let i = 0; i < engineCount; i++) next[i] = val;
      }
      return next;
    });

    setReverse(prev => {
      const next = [...prev];
      const resolvedMode = typeof forcedReverse === 'boolean'
        ? forcedReverse
        : deriveReverseFromLever(val, prev[index] ?? false);
      next[index] = resolvedMode;
      if (sync) {
        for (let i = 0; i < engineCount; i++) next[i] = resolvedMode;
      }
      reverseRef.current = next;
      return next;
    });

    const cmd = mapLeverToCommand(val);
    if (controlThrust) controlThrust(index, cmd);

    if (sync) {
      for (let i = 0; i < engineCount; i++) {
        if (i !== index && controlThrust) {
          controlThrust(i, cmd);
        }
      }
    }
  }, [controlThrust, sync, engineCount, deriveReverseFromLever]);

  const onDrag = (index, e) => {
    isDraggingRef.current[index] = true;
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();

    const move = (evt) => {
      const y = (evt.touches ? evt.touches[0].clientY : evt.clientY) - rect.top;
      const pct = Math.max(0, Math.min(100, (1 - y / rect.height) * 100));
      const raw = pct / 100;
      const currentReverseState = reverseRef.current[index] ?? false;

      let clamped = raw;
      if (!currentReverseState) {
        clamped = Math.max(FORWARD_IDLE_LEVER, raw);
      } else {
        clamped = Math.min(REVERSE_DETENT, raw);
      }

      setLeverThrottle(index, clamped, { forcedReverse: currentReverseState });
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

  const toggleReverse = (index) => {
    const targetReverse = !(reverseRef.current[index] ?? false);
    const newVal = targetReverse ? REVERSE_IDLE_LEVER : FORWARD_IDLE_LEVER;
    setLeverThrottle(index, newVal, { forcedReverse: targetReverse });
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
                const firstRev = reverseRef.current[0] || false;
                const nextReverse = Array(engineCount).fill(firstRev);
                reverseRef.current = nextReverse;
                setReverse(nextReverse);
              }
            }
          }),
          'Sync'
        )
      )
  );

};

export default ThrustManager;
