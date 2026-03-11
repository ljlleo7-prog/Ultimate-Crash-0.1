import React, { useState, useEffect, useMemo, useRef } from 'react';
import { failureGraphManager } from '../services/skylinetragedy/FailureGraphManager.js';

const FailureDebugPanel = ({ physicsService, onClose }) => {
    const [activeFailures, setActiveFailures] = useState([]);
    const [graphFailures, setGraphFailures] = useState([]);
    const [graphEdges, setGraphEdges] = useState([]);
    const [nodePositions, setNodePositions] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [mapSize, setMapSize] = useState({ width: 1200, height: 680 });
    const mapRef = useRef(null);
    const draggingRef = useRef(null);

    useEffect(() => {
        if (!physicsService || !physicsService.failureSystem) return;
        const interval = setInterval(() => {
            const fs = physicsService.failureSystem;
            if (!fs) return;
            setActiveFailures(Array.from(fs.activeFailures.values()));
        }, 250);
        return () => clearInterval(interval);
    }, [physicsService]);

    useEffect(() => {
        let isMounted = true;
        const loadGraph = async () => {
            setIsLoading(true);
            await failureGraphManager.initialize();
            if (!isMounted) return;
            setGraphFailures(failureGraphManager.getAllFailures());
            setGraphEdges(failureGraphManager.getAllEdges());
            setIsLoading(false);
        };
        loadGraph();
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (!mapRef.current) return;
        const updateSize = () => {
            if (!mapRef.current) return;
            const nextWidth = mapRef.current.clientWidth;
            const nextHeight = mapRef.current.clientHeight;
            setMapSize(prev => {
                if (prev.width === nextWidth && prev.height === nextHeight) {
                    return prev;
                }
                return { width: nextWidth, height: nextHeight };
            });
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    const failureById = useMemo(() => new Map(graphFailures.map(f => [f.id, f])), [graphFailures]);

    const initialPositions = useMemo(() => {
        const padding = 40;
        const rowGap = 90;
        const systems = Array.from(new Set(graphFailures.map(f => f.system || 'OTHER'))).sort();
        const columnCount = Math.max(1, systems.length);
        const columnWidth = Math.max(240, (mapSize.width - padding * 2) / columnCount);
        const grouped = systems.reduce((acc, system) => {
            acc[system] = [];
            return acc;
        }, {});
        graphFailures.forEach(failure => {
            const system = failure.system || 'OTHER';
            if (!grouped[system]) grouped[system] = [];
            grouped[system].push(failure);
        });
        Object.values(grouped).forEach(items => {
            items.sort((a, b) => (b.severity || 0) - (a.severity || 0) || String(a.failure_code || a.id).localeCompare(String(b.failure_code || b.id)));
        });
        const positions = {};
        systems.forEach((system, columnIndex) => {
            const items = grouped[system] || [];
            items.forEach((failure, rowIndex) => {
                positions[failure.id] = {
                    x: padding + columnIndex * columnWidth,
                    y: padding + rowIndex * rowGap
                };
            });
        });
        return positions;
    }, [graphFailures, mapSize.width]);

    useEffect(() => {
        if (graphFailures.length === 0) return;
        setNodePositions(prev => {
            const next = { ...prev };
            Object.entries(initialPositions).forEach(([id, pos]) => {
                if (!next[id]) next[id] = pos;
            });
            return next;
        });
    }, [graphFailures, initialPositions]);

    useEffect(() => {
        const handleMove = (event) => {
            if (!draggingRef.current || !mapRef.current) return;
            const dragData = draggingRef.current;
            const rect = mapRef.current.getBoundingClientRect();
            const nodeWidth = 190;
            const nodeHeight = 64;
            const x = event.clientX - rect.left - dragData.offsetX;
            const y = event.clientY - rect.top - dragData.offsetY;
            const clampedX = Math.max(10, Math.min(x, mapSize.width - nodeWidth - 10));
            const clampedY = Math.max(10, Math.min(y, mapSize.height - nodeHeight - 10));
            setNodePositions(prev => ({
                ...prev,
                [dragData.id]: { x: clampedX, y: clampedY }
            }));
        };
        const handleUp = () => {
            draggingRef.current = null;
        };
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
    }, [mapSize]);

    const getEdgeDelay = (edge) => {
        if (typeof edge.delay_seconds === 'number') return edge.delay_seconds;
        const target = failureById.get(edge.effect_failure);
        const timeScale = target?.time_scale;
        if (timeScale === 'immediate') return 2;
        if (timeScale === 'fast') return 6;
        if (timeScale === 'medium') return 12;
        if (timeScale === 'slow') return 20;
        if (timeScale === 'very_slow') return 35;
        return 15;
    };

    const delayValues = useMemo(() => {
        const values = graphEdges.map(getEdgeDelay).filter(val => Number.isFinite(val));
        return values.sort((a, b) => a - b);
    }, [graphEdges, failureById]);

    const speedThresholds = useMemo(() => {
        if (delayValues.length === 0) {
            return { fast: 5, mid: 15 };
        }
        const fastIndex = Math.floor(delayValues.length * 0.33);
        const midIndex = Math.floor(delayValues.length * 0.66);
        return {
            fast: delayValues[Math.max(0, fastIndex)],
            mid: delayValues[Math.max(0, midIndex)]
        };
    }, [delayValues]);

    const getSpeedColor = (edge) => {
        const delay = getEdgeDelay(edge);
        if (delay <= speedThresholds.fast) return '#ff4d4d';
        if (delay <= speedThresholds.mid) return '#4ade80';
        return '#4b82f2';
    };

    const handleTrigger = (id) => {
        if (physicsService && physicsService.failureSystem) {
            physicsService.failureSystem.triggerFailure(id);
        }
    };

    if (!physicsService || !physicsService.failureSystem) {
        return null;
    }

    const nodeWidth = 190;
    const nodeHeight = 64;

    return (
        <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(10, 15, 20, 0.95)',
            color: '#e0e0e0',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '12px',
            padding: '22px',
            borderRadius: '12px',
            zIndex: 9999,
            border: '1px solid #334455',
            width: '1300px',
            height: '860px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 0 80px rgba(0, 0, 0, 0.8)'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px',
                borderBottom: '1px solid #334455',
                paddingBottom: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '12px',
                        height: '12px',
                        background: activeFailures.length > 0 ? '#ff3333' : '#4ade80',
                        borderRadius: '50%',
                        boxShadow: activeFailures.length > 0 ? '0 0 10px #ff3333' : '0 0 10px #4ade80'
                    }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>FAILURE CASCADE MAP</span>
                        <span style={{ fontSize: '10px', color: '#6b7c90' }}>
                            Nodes: {graphFailures.length} · Links: {graphEdges.length} · Active: {activeFailures.length}
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '10px', color: '#99a7b6' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '16px', height: '3px', background: '#ff4d4d', display: 'inline-block' }} />
                            FAST
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '16px', height: '3px', background: '#4ade80', display: 'inline-block' }} />
                            MID
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '16px', height: '3px', background: '#4b82f2', display: 'inline-block' }} />
                            SLOW
                        </span>
                        <span style={{ color: '#667788' }}>THICK = HIGH PROB</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#8899aa', display: 'flex', alignItems: 'center' }}>
                        DIFFICULTY: <span style={{ color: '#fff', marginLeft: '6px' }}>{(physicsService.difficulty || 'ROOKIE').toUpperCase()}</span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#667788',
                            cursor: 'pointer',
                            fontSize: '20px'
                        }}
                    >
                        ×
                    </button>
                </div>
            </div>

            <div
                ref={mapRef}
                style={{
                    position: 'relative',
                    flex: 1,
                    borderRadius: '10px',
                    border: '1px solid #223344',
                    overflow: 'auto',
                    background: 'radial-gradient(circle at 20% 20%, rgba(40, 60, 80, 0.25), transparent 45%), linear-gradient(0deg, rgba(20, 28, 36, 0.95), rgba(12, 18, 26, 0.95))',
                    boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)'
                }}
            >
                <svg
                    width={mapSize.width}
                    height={mapSize.height}
                    style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
                >
                    {graphEdges.map(edge => {
                        const fromPos = nodePositions[edge.cause_failure] || initialPositions[edge.cause_failure];
                        const toPos = nodePositions[edge.effect_failure] || initialPositions[edge.effect_failure];
                        if (!fromPos || !toPos) return null;
                        const x1 = fromPos.x + nodeWidth / 2;
                        const y1 = fromPos.y + nodeHeight / 2;
                        const x2 = toPos.x + nodeWidth / 2;
                        const y2 = toPos.y + nodeHeight / 2;
                        const dx = Math.max(60, Math.abs(x2 - x1) / 2);
                        const probability = typeof edge.probability === 'number' ? edge.probability : 0.5;
                        const strokeWidth = 1.5 + probability * 5;
                        const strokeOpacity = 0.35 + probability * 0.65;
                        const color = getSpeedColor(edge);
                        return (
                            <path
                                key={edge.id}
                                d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                                stroke={color}
                                strokeWidth={strokeWidth}
                                strokeOpacity={strokeOpacity}
                                fill="none"
                            />
                        );
                    })}
                </svg>

                {graphFailures.map(failure => {
                    const pos = nodePositions[failure.id] || initialPositions[failure.id] || { x: 0, y: 0 };
                    const isActive = activeFailures.some(active => active.id === failure.id);
                    return (
                        <div
                            key={failure.id}
                            onMouseDown={(event) => {
                                if (!mapRef.current) return;
                                const rect = mapRef.current.getBoundingClientRect();
                                draggingRef.current = {
                                    id: failure.id,
                                    offsetX: event.clientX - rect.left - pos.x,
                                    offsetY: event.clientY - rect.top - pos.y
                                };
                            }}
                            onDoubleClick={() => handleTrigger(failure.id)}
                            style={{
                                position: 'absolute',
                                left: `${pos.x}px`,
                                top: `${pos.y}px`,
                                width: `${nodeWidth}px`,
                                height: `${nodeHeight}px`,
                                background: isActive ? 'linear-gradient(135deg, rgba(80, 30, 30, 0.9), rgba(30, 15, 15, 0.95))' : 'rgba(22, 30, 40, 0.92)',
                                border: isActive ? '1px solid #ff4d4d' : '1px solid #2a3b4c',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                cursor: 'grab',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                boxShadow: isActive ? '0 0 18px rgba(255, 77, 77, 0.4)' : '0 0 12px rgba(0, 0, 0, 0.4)',
                                userSelect: 'none'
                            }}
                        >
                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#e8edf2' }}>
                                {failure.description || failure.failure_code || failure.id}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#8fa1b5' }}>
                                <span>{(failure.system || 'OTHER').toUpperCase()}</span>
                                <span>{(failure.time_scale || 'unknown').toUpperCase()}</span>
                            </div>
                        </div>
                    );
                })}

                {isLoading && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(8, 12, 16, 0.75)',
                        color: '#cbd5e1',
                        fontSize: '12px',
                        letterSpacing: '1px'
                    }}>
                        LOADING FAILURE GRAPH...
                    </div>
                )}
            </div>
        </div>
    );
};

export default FailureDebugPanel;
