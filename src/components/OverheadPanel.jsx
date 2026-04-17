
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { resolveOverheadPanelLayout } from '../data/overheadPanelLayouts.js';
import { b737OverheadEditableLayout } from '../data/b737OverheadEditableLayout.js';
import { b737BuilderCatalog, builderTypeCatalog, b737RequiredBuilderIds, builderTypeTargets, buildGenericBuilderElement } from './overhead/builder/catalog.js';
import './FlightPanel.css';

const OverheadPanel = ({ onClose, flightState, onSystemAction, aircraftModel, aircraftData }) => {
  const { t } = useLanguage();
  const [panelPosition, setPanelPosition] = useState({ x: 0, y: 0 });
  const [b737EditorLayout, setB737EditorLayout] = useState(() => JSON.parse(JSON.stringify(b737OverheadEditableLayout)));
  const [layoutDebug, setLayoutDebug] = useState(false);
  const [builderMode, setBuilderMode] = useState(false);
  const [builderStyle, setBuilderStyle] = useState('classic');
  const [panelZoom, setPanelZoom] = useState(1);
  const [editorFullscreen, setEditorFullscreen] = useState(true);
  const [editorPanelPosition, setEditorPanelPosition] = useState({ x: 0, y: 0 });
  const [builderPanelPosition, setBuilderPanelPosition] = useState({ x: -282, y: 0 });
  const [selectedEditorTarget, setSelectedEditorTarget] = useState(null);
  const [alignmentGuides, setAlignmentGuides] = useState([]);
  const dragStateRef = useRef(null);
  const editorDragStateRef = useRef(null);
  const floatingPanelDragRef = useRef(null);
  const editorFileInputRef = useRef(null);
  const panelLayout = resolveOverheadPanelLayout(aircraftData, aircraftModel);
  const isAirbus = panelLayout.legacyVariant === 'airbus';
  const is737 = panelLayout.legacyVariant === 'b737';
  
  // Helper to get system state safely
  const getSys = (path, def) => {
    if (!flightState.systems) return def;
    const parts = path.split('.');
    let current = flightState.systems;
    for (const part of parts) {
      if (current === undefined || current === null) return def;
      current = current[part];
    }
    return current ?? def;
  };

  const hasPower = getSys('electrical.dcVolts', 0) > 15;
  const acVoltsMain = getSys('electrical.acVolts', 0);
  const hasACPower = acVoltsMain > 100;
  const apuRunning = getSys('apu.running', false);
  const ductPressL = getSys('pressurization.ductPressL', 0);
  const ductPressR = getSys('pressurization.ductPressR', 0);
  const hasEngineStartAir = ductPressL > 20 || ductPressR > 20;
  const fixedBuilderElementIds = new Set(b737BuilderCatalog.map((item) => item.id));

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!dragStateRef.current) return;
      const { startX, startY, originX, originY } = dragStateRef.current;
      setPanelPosition({
        x: originX + (event.clientX - startX),
        y: originY + (event.clientY - startY)
      });
    };

    const handleMouseUp = () => {
      dragStateRef.current = null;
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, []);

  useEffect(() => {
    const handleFloatingPanelMouseMove = (event) => {
      if (!floatingPanelDragRef.current) {
        return;
      }
      const { panel, startX, startY, originX, originY } = floatingPanelDragRef.current;
      const nextPosition = {
        x: originX + (event.clientX - startX),
        y: originY + (event.clientY - startY)
      };
      if (panel === 'editor') {
        setEditorPanelPosition(nextPosition);
      } else if (panel === 'builder') {
        setBuilderPanelPosition(nextPosition);
      }
    };

    const handleFloatingPanelMouseUp = () => {
      if (!floatingPanelDragRef.current) {
        return;
      }
      floatingPanelDragRef.current = null;
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', handleFloatingPanelMouseMove);
    document.addEventListener('mouseup', handleFloatingPanelMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleFloatingPanelMouseMove);
      document.removeEventListener('mouseup', handleFloatingPanelMouseUp);
    };
  }, []);

  useEffect(() => {
    if (layoutDebug || builderMode) {
      setEditorFullscreen(true);
    }
  }, [layoutDebug, builderMode]);

  useEffect(() => {
    const handleEditorMouseMove = (event) => {
      if (!editorDragStateRef.current || !layoutDebug) {
        return;
      }

      const canvasWidth = b737EditorLayout?.canvas?.width || 1240;
      const canvasHeight = b737EditorLayout?.canvas?.height || 900;
      const deltaX = (event.clientX - editorDragStateRef.current.startX) / canvasWidth;
      const deltaY = (event.clientY - editorDragStateRef.current.startY) / canvasHeight;

      if (editorDragStateRef.current.targetType === 'control') {
        if (editorDragStateRef.current.mode === 'resize') {
          resizeB737ControlElement(editorDragStateRef.current.id, deltaX, deltaY);
        } else {
          moveB737ControlElement(editorDragStateRef.current.id, deltaX, deltaY);
        }
        editorDragStateRef.current.startX = event.clientX;
        editorDragStateRef.current.startY = event.clientY;
        return;
      }

      if (editorDragStateRef.current.targetType === 'child') {
        if (editorDragStateRef.current.mode === 'resize') {
          resizeB737ChildElement(editorDragStateRef.current.id, deltaX, deltaY);
        } else {
          moveB737ChildElement(editorDragStateRef.current.id, deltaX, deltaY);
        }
        editorDragStateRef.current.startX = event.clientX;
        editorDragStateRef.current.startY = event.clientY;
        return;
      }

      moveB737Element(editorDragStateRef.current.id, deltaX, deltaY, { groupMove: editorDragStateRef.current.groupMove });
      editorDragStateRef.current.startX = event.clientX;
      editorDragStateRef.current.startY = event.clientY;
    };

    const handleEditorMouseUp = () => {
      if (!editorDragStateRef.current) {
        return;
      }
      editorDragStateRef.current = null;
      setAlignmentGuides([]);
      document.body.style.cursor = 'default';
    };

    const handleEditorKeyDown = (event) => {
      if (!layoutDebug || !selectedEditorTarget) {
        return;
      }
      const step = event.shiftKey ? 0.01 : 0.0025;
      let deltaX = 0;
      let deltaY = 0;
      if (event.key === 'ArrowLeft') deltaX = -step;
      if (event.key === 'ArrowRight') deltaX = step;
      if (event.key === 'ArrowUp') deltaY = -step;
      if (event.key === 'ArrowDown') deltaY = step;
      if (!deltaX && !deltaY) {
        return;
      }
      event.preventDefault();
      if (selectedEditorTarget.type === 'control') {
        if (event.metaKey || event.ctrlKey) {
          resizeB737ControlElement(selectedEditorTarget.id, deltaX, deltaY);
        } else {
          moveB737ControlElement(selectedEditorTarget.id, deltaX, deltaY);
        }
      } else if (selectedEditorTarget.type === 'child') {
        if (event.metaKey || event.ctrlKey) {
          resizeB737ChildElement(selectedEditorTarget.id, deltaX, deltaY);
        } else {
          moveB737ChildElement(selectedEditorTarget.id, deltaX, deltaY);
        }
      } else {
        moveB737Element(selectedEditorTarget.id, deltaX, deltaY, { groupMove: event.altKey });
      }
    };

    document.addEventListener('mousemove', handleEditorMouseMove);
    document.addEventListener('mouseup', handleEditorMouseUp);
    document.addEventListener('keydown', handleEditorKeyDown);
    return () => {
      document.removeEventListener('mousemove', handleEditorMouseMove);
      document.removeEventListener('mouseup', handleEditorMouseUp);
      document.removeEventListener('keydown', handleEditorKeyDown);
    };
  }, [layoutDebug, selectedEditorTarget, b737EditorLayout]);

  const startDrag = (event) => {
    if (event.button !== 0) return;
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: panelPosition.x,
      originY: panelPosition.y
    };
    document.body.style.cursor = 'move';
    event.preventDefault();
  };

  const startFloatingPanelDrag = (panel, event) => {
    if (event.button !== 0 || event.target.closest('button, input, select, textarea, label')) return;
    const origin = panel === 'editor' ? editorPanelPosition : builderPanelPosition;
    floatingPanelDragRef.current = {
      panel,
      startX: event.clientX,
      startY: event.clientY,
      originX: origin.x,
      originY: origin.y
    };
    document.body.style.cursor = 'move';
    event.preventDefault();
    event.stopPropagation();
  };

  // --- REUSABLE UI COMPONENTS ---

  const Annunciator = ({ label, color = 'amber', active }) => (
    <div style={{
      background: active && hasPower ? (color === 'red' ? '#ff3333' : color === 'blue' ? '#00ccff' : (color === 'green' ? '#00ff00' : '#ffaa00')) : '#222',
      color: active && hasPower ? '#000' : '#444',
      fontSize: '9px',
      fontWeight: 'bold',
      padding: '2px 4px',
      borderRadius: '1px',
      textAlign: 'center',
      minWidth: '40px',
      boxShadow: active && hasPower ? `0 0 8px ${color === 'red' ? '#f00' : (color === 'blue' ? '#0cf' : (color === 'green' ? '#0f0' : '#fa0'))}` : 'none',
      border: '1px solid #111',
      marginTop: '2px',
      opacity: active && hasPower ? 1 : 0.7,
      transition: 'all 0.1s'
    }}>
      {label}
    </div>
  );

  // 737 Style: Metallic Round Toggle Switch
  const MetallicToggleSwitch = ({ label, active, onClick, annunciator, subLabel, enabled = true }) => (
    <div className="metallic-switch-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '8px' }}>
      {/* 737 Lights are usually above the switch */}
      {annunciator && (
        <div style={{ marginBottom: '4px' }}>
          <Annunciator label={annunciator.label} active={annunciator.active} color={annunciator.color} />
        </div>
      )}
      
      <div 
        onClick={enabled ? onClick : undefined}
        style={{ 
          width: '40px', 
          height: '40px', 
          position: 'relative',
          cursor: enabled ? 'pointer' : 'default',
          opacity: enabled ? 1 : 0.6
        }}
      >
        {/* Base Plate */}
        <div style={{
          position: 'absolute', top: '5px', left: '5px', right: '5px', bottom: '5px',
          background: '#888',
          borderRadius: '50%',
          boxShadow: 'inset 0 0 5px #000',
          border: '1px solid #555'
        }}></div>

        {/* Toggle Lever */}
        <div style={{
          position: 'absolute',
          top: active ? '2px' : '18px',
          left: '12px',
          width: '16px',
          height: '24px',
          background: 'linear-gradient(90deg, #d0d0d0, #f8f8f8, #a0a0a0)',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
          transition: 'top 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 2
        }}>
            {/* Cap highlight */}
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.8)', borderRadius: '8px 8px 0 0' }}></div>
        </div>
      </div>
      <span style={{ fontSize: '10px', marginTop: '2px', color: '#eee', textAlign: 'center', fontWeight: 'bold', textShadow: '0 1px 2px #000' }}>{label}</span>
      {subLabel && <span style={{ fontSize: '8px', color: '#ccc' }}>{subLabel}</span>}
    </div>
  );

  // 7X7 Style: Square Button (Top Green ON, Bottom Amber FAULT)
  const BoeingSquareButton = ({ label, active, onClick, fault = false, subLabel = "ON", invertLight = false, specialLabel = null, enabled = true, annunciator }) => {
    // Logic:
    // Top Half: ON (Green) - Active state
    // Bottom Half: FAULT (Amber) or OFF/PRESS (Amber) - Fault state or Annunciator state
    
    const isTopLit = hasPower && active; 
    const isBottomLit = hasPower && (fault || (annunciator && annunciator.active));
    
    const topText = specialLabel || subLabel || t('ui.systems.on');
    const bottomText = fault ? t('ui.systems.fault') : (annunciator ? annunciator.label : '');
    const bottomColor = fault ? '#ff9900' : (annunciator ? (annunciator.color === 'blue' ? '#00ffff' : '#ff9900') : '#ff9900');

    return (
        <div className="boeing-btn-wrapper" style={{ margin: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '10px', color: '#ccc', marginBottom: '4px', fontWeight: 'bold' }}>{label}</div>
            <div 
                onClick={enabled ? onClick : undefined}
                style={{ 
                    width: '40px', 
                    height: '40px', 
                    background: '#111', 
                    border: '2px solid #555',
                    borderRadius: '2px',
                    cursor: enabled ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: enabled ? 1 : 0.6,
                    boxShadow: active ? 'inset 0 0 5px #000' : '0 2px 4px rgba(0,0,0,0.5)'
                }}
            >
                {/* Top Half (Green ON) */}
                <div style={{ 
                    flex: 1, 
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    borderBottom: '1px solid #333',
                    background: isTopLit ? 'rgba(0, 255, 0, 0.2)' : 'transparent'
                }}>
                    <span style={{ 
                        fontSize: '9px', fontWeight: 'bold', 
                        color: isTopLit ? '#00ff00' : '#444',
                        textShadow: isTopLit ? '0 0 5px #00ff00' : 'none',
                        visibility: isTopLit ? 'visible' : 'hidden' // Hide text when off per user "dark when off"
                    }}>{topText}</span>
                </div>

                {/* Bottom Half (Amber FAULT/Status) */}
                <div style={{ 
                    flex: 1, 
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    background: isBottomLit ? `rgba(${bottomColor === '#00ffff' ? '0,255,255' : '255,160,0'}, 0.2)` : 'transparent'
                }}>
                     <span style={{ 
                        fontSize: '8px', fontWeight: 'bold', 
                        color: isBottomLit ? bottomColor : '#444',
                        textShadow: isBottomLit ? `0 0 5px ${bottomColor}` : 'none',
                        visibility: isBottomLit ? 'visible' : 'hidden'
                    }}>{bottomText}</span>
                </div>
            </div>
        </div>
    );
  };

  // A3XX Style: Airbus Square Button (Bottom Boxed)
  const AirbusButton = ({ label, active, onClick, fault = false, subLabel = "ON", invertLight = false, specialLabel = null, enabled = true, annunciator }) => {
    // "Lights Out" Philosophy:
    // Top: System Label (always visible? Or hidden? User said "bottom boxed on/off") -> usually printed on button
    // Bottom: Status Light (Boxed)
    //   - OFF: White "OFF"
    //   - FAULT: Amber "FAULT"
    //   - ON: Green/Cyan (if invertLight or special)

    let statusText = null;
    let statusColor = null;
    let isLit = false;

    if (hasPower && enabled) {
        if (fault) {
            statusText = 'FAULT';
            statusColor = '#ff9900'; // Amber
            isLit = true;
        } else if (annunciator && annunciator.active) {
            statusText = annunciator.label;
            statusColor = annunciator.color === 'blue' ? '#00ffff' : (annunciator.color === 'green' ? '#00ff00' : '#ff9900');
            isLit = true;
        } else if (specialLabel) {
            statusText = specialLabel;
            statusColor = '#00ff00'; // Green
            isLit = true;
        } else if (invertLight) {
            // Active = Light ON
            if (active) {
                statusText = subLabel || 'ON';
                statusColor = '#00ffff'; // Cyan (Airbus often uses cyan/blue for ON)
                isLit = true;
            }
        } else {
            // Standard: Inactive = Light ON (OFF white)
            if (!active) {
                statusText = t('ui.systems.off');
                statusColor = '#ffffff'; // White
                isLit = true;
            }
        }
    }

    return (
        <div className="airbus-button-container" style={{ margin: '6px' }}>
          <div 
            onClick={onClick}
            style={{ 
              width: '45px', 
              height: '45px', 
              background: '#151515', 
              border: '2px solid #555',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between', // Top label, bottom light
              alignItems: 'center',
              boxShadow: active ? 'inset 0 0 5px rgba(0,0,0,0.8)' : 'inset 0 0 2px rgba(255,255,255,0.1)',
              position: 'relative',
              padding: '4px 0'
            }}
          >
            {/* Label (Printed on button) */}
            <div style={{ fontSize: '9px', color: '#bbb', textAlign: 'center', lineHeight: '1.1' }}>{label}</div>
            
            {/* Status Light Area (Boxed) */}
            <div style={{ 
                height: '16px', 
                width: '36px',
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                marginBottom: '2px'
            }}>
                {isLit && (
                    <div style={{ 
                        color: statusColor, 
                        fontSize: '9px', 
                        fontWeight: 'bold', 
                        textShadow: `0 0 4px ${statusColor}`,
                        // boxed look
                        width: '100%',
                        textAlign: 'center',
                        background: 'rgba(0,0,0,0.4)' 
                    }}>
                        {statusText}
                    </div>
                )}
            </div>
          </div>
        </div>
    );
  };

  const InopModule = ({ title }) => (
    <div className="panel-section">
      <h4 className="panel-title">{title}</h4>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60px' }}>
        <Annunciator label="INOP" color="amber" active={hasPower} />
      </div>
    </div>
  );

  const Switch = isAirbus ? AirbusButton : (is737 ? MetallicToggleSwitch : BoeingSquareButton);


  const Gauge = ({ label, value, unit, min = 0, max = 100, color = '#0f0' }) => (
    <div style={{ background: '#111', padding: '5px', borderRadius: '4px', border: '1px solid #333', textAlign: 'center', minWidth: '60px' }}>
      <div style={{ fontSize: '9px', color: '#aaa', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '14px', fontFamily: 'monospace', color: color, fontWeight: 'bold' }}>
        {value}
      </div>
      <div style={{ fontSize: '8px', color: '#666' }}>{unit}</div>
      {/* Simple Bar */}
      <div style={{ width: '100%', height: '3px', background: '#333', marginTop: '3px' }}>
        <div style={{ 
          width: `${Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))}%`, 
          height: '100%', 
          background: color 
        }}/>
      </div>
    </div>
  );

  const RotarySelector = ({ label, active, onClick, subLabel, enabled = true }) => {
      // 737 Style Knob
      // Active (true) = Horizontal (Open/Connected) - User Preference
      // Inactive (false) = Vertical (Closed/Off)
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '8px' }}>
            <div 
                onClick={enabled ? onClick : undefined}
                style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'conic-gradient(#ddd 0deg, #999 90deg, #ddd 180deg, #999 270deg)',
                    border: '1px solid #444',
                    position: 'relative',
                    transform: active ? 'rotate(0deg)' : 'rotate(90deg)',
                    transition: 'transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                    cursor: enabled ? 'pointer' : 'default',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.5)'
                }}
            >
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: '36px', height: '6px',
                    background: '#e0e0e0',
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '2px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.5)'
                }}></div>
                 <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: '4px', height: '16px',
                    background: '#333',
                    transform: 'translate(-50%, -100%)', // Pointer part
                    borderRadius: '1px'
                }}></div>
            </div>
            <div style={{ fontSize: '9px', marginTop: '4px', color: '#eee', fontWeight: 'bold' }}>{label}</div>
            {subLabel && <div style={{ fontSize: '8px', color: '#aaa' }}>{subLabel}</div>}
        </div>
      );
  };

  // --- SUB-PANELS ---

  const B737FuelPanel = () => {
    const tankL = getSys('fuel.tanks.left', 0);
    const tankR = getSys('fuel.tanks.right', 0);
    const tankC = getSys('fuel.tanks.center', 0);
    const pressL = getSys('fuel.pressL', 0);
    const pressR = getSys('fuel.pressR', 0);
    const pressC = getSys('fuel.pressC', 0);
    
    // Line Logic
    const lPumpsOn = getSys('fuel.leftPumps');
    const rPumpsOn = getSys('fuel.rightPumps');
    const cPumpsOn = getSys('fuel.centerPumps');
    const xFeedOpen = getSys('fuel.crossfeed');

    return (
        <div className="panel-section" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <h4 className="panel-title">{t('ui.systems.fuel')}</h4>
            
            {/* Qty Display */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '15px', background: '#000', padding: '4px', border: '2px solid #555' }}>
                 <div className="digital-qty" style={{ textAlign: 'center' }}>{Math.round(tankL)}</div>
                 <div className="digital-qty" style={{ textAlign: 'center' }}>{Math.round(tankC)}</div>
                 <div className="digital-qty" style={{ textAlign: 'center' }}>{Math.round(tankR)}</div>
            </div>

            {/* Main Grid for Pumps & Lines */}
            <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: '80px 80px', padding: '10px 0' }}>
                 
                 {/* SVG Overlay - Dynamic Green Lines */}
                 <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.8, zIndex: 0 }}>
                    {/* Vertical Lines Left */}
                    <line x1="12.5%" y1="25%" x2="12.5%" y2="75%" stroke={lPumpsOn ? '#0f0' : '#444'} strokeWidth="2" />
                    <line x1="37.5%" y1="25%" x2="37.5%" y2="50%" stroke={cPumpsOn ? '#0f0' : '#444'} strokeWidth="2" />
                    {/* Vertical Lines Right */}
                    <line x1="62.5%" y1="25%" x2="62.5%" y2="50%" stroke={cPumpsOn ? '#0f0' : '#444'} strokeWidth="2" />
                    <line x1="87.5%" y1="25%" x2="87.5%" y2="75%" stroke={rPumpsOn ? '#0f0' : '#444'} strokeWidth="2" />
                    
                    {/* Horizontal Crossfeed Manifold - Aligned with Row 2 (75%) */}
                    <line x1="12.5%" y1="75%" x2="87.5%" y2="75%" stroke={xFeedOpen ? '#0f0' : '#444'} strokeWidth="3" />
                    
                    {/* Crossfeed Valve Circle */}
                    <circle cx="50%" cy="75%" r="18" stroke={xFeedOpen ? '#0f0' : '#444'} strokeWidth="2" fill="#1a1a1a" />
                 </svg>

                 {/* Row 1: FWD/Center Pumps */}
                 <div style={{ justifySelf: 'center', alignSelf: 'center', zIndex: 1 }}>
                    <Switch label="L PUMP 1" active={getSys('fuel.leftPumps')} onClick={() => onSystemAction('fuel', 'leftPumps')} 
                        annunciator={{ label: t('ui.systems.low_press'), active: pressL < 10, color: 'amber' }} enabled={hasPower} />
                 </div>
                 <div style={{ justifySelf: 'center', alignSelf: 'center', zIndex: 1 }}>
                    <Switch label="CTR L" active={getSys('fuel.centerPumps')} onClick={() => onSystemAction('fuel', 'centerPumps')} 
                        annunciator={{ label: t('ui.systems.low_press'), active: getSys('fuel.centerPumps') && pressC < 10, color: 'amber' }} enabled={hasPower} />
                 </div>
                 <div style={{ justifySelf: 'center', alignSelf: 'center', zIndex: 1 }}>
                    <Switch label="CTR R" active={getSys('fuel.centerPumps')} onClick={() => onSystemAction('fuel', 'centerPumps')} 
                        annunciator={{ label: t('ui.systems.low_press'), active: getSys('fuel.centerPumps') && pressC < 10, color: 'amber' }} enabled={hasPower} />
                 </div>
                 <div style={{ justifySelf: 'center', alignSelf: 'center', zIndex: 1 }}>
                    <Switch label="R PUMP 1" active={getSys('fuel.rightPumps')} onClick={() => onSystemAction('fuel', 'rightPumps')} 
                        annunciator={{ label: t('ui.systems.low_press'), active: pressR < 10, color: 'amber' }} enabled={hasPower} />
                 </div>

                 {/* Row 2: AFT Pumps & Crossfeed */}
                 <div style={{ justifySelf: 'center', alignSelf: 'center', zIndex: 1 }}>
                    <Switch label="L PUMP 2" active={getSys('fuel.leftPumps')} onClick={() => onSystemAction('fuel', 'leftPumps')} 
                        annunciator={{ label: t('ui.systems.low_press'), active: pressL < 10, color: 'amber' }} enabled={hasPower} />
                 </div>
                 
                 {/* Crossfeed spans middle 2 cols */}
                 <div style={{ gridColumn: '2 / span 2', justifySelf: 'center', alignSelf: 'center', zIndex: 2 }}>
                     <RotarySelector label="CROSSFEED" active={getSys('fuel.crossfeed')} onClick={() => onSystemAction('fuel', 'crossfeed')} subLabel={t('ui.systems.valve')} />
                     <div style={{ fontSize: '8px', color: '#0af', textAlign: 'center', marginTop: '2px', background: '#000', padding: '1px' }}>
                         {getSys('fuel.crossfeed') ? t('ui.systems.open') : ''}
                     </div>
                 </div>

                 <div style={{ justifySelf: 'center', alignSelf: 'center', zIndex: 1 }}>
                    <Switch label="R PUMP 2" active={getSys('fuel.rightPumps')} onClick={() => onSystemAction('fuel', 'rightPumps')} 
                        annunciator={{ label: t('ui.systems.low_press'), active: pressR < 10, color: 'amber' }} enabled={hasPower} />
                 </div>
            </div>
        </div>
    );
  };

  const B737ElectricalPanel = () => {
    const dcVolts = getSys('electrical.dcVolts', 0);
    const acVolts = getSys('electrical.acVolts', 0);
    const bat = getSys('electrical.battery');
    
    // Line Logic
    const gen1 = getSys('electrical.gen1');
    const gen2 = getSys('electrical.gen2');
    const apuGen = getSys('electrical.apuGen');
    const busPowered = gen1 || gen2 || apuGen || bat;

    return (
        <div className="panel-section" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
             <h4 className="panel-title">{t('ui.systems.electrics')}</h4>
             
             {/* Meters */}
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto 1fr 1fr', gap: '5px', marginBottom: '15px', background: '#111', padding: '5px', border: '1px solid #444' }}>
                 <div style={{ textAlign: 'center' }}>
                     <div style={{ fontSize: '9px', color: '#ccc' }}>DC AMPS</div>
                     <div style={{ fontSize: '14px', color: '#0f0', fontFamily: 'monospace' }}>0</div>
                 </div>
                 <div style={{ textAlign: 'center' }}>
                     <div style={{ fontSize: '9px', color: '#ccc' }}>DC VOLTS</div>
                     <div style={{ fontSize: '14px', color: '#0f0', fontFamily: 'monospace' }}>{Math.round(dcVolts)}</div>
                 </div>
                 <div style={{ width: '1px', background: '#444' }}></div>
                 <div style={{ textAlign: 'center' }}>
                     <div style={{ fontSize: '9px', color: '#ccc' }}>AC FREQ</div>
                     <div style={{ fontSize: '14px', color: '#0f0', fontFamily: 'monospace' }}>400</div>
                 </div>
                 <div style={{ textAlign: 'center' }}>
                     <div style={{ fontSize: '9px', color: '#ccc' }}>AC VOLTS</div>
                     <div style={{ fontSize: '14px', color: '#0f0', fontFamily: 'monospace' }}>{Math.round(acVolts)}</div>
                 </div>
             </div>

             {/* Main Switch Grid */}
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', rowGap: '20px', position: 'relative', paddingBottom: '10px' }}>
                 
                 {/* Lines Overlay - Dynamic Green */}
                 <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.8 }}>
                     {/* Battery Bus (Top) */}
                     <line x1="16.67%" y1="25%" x2="83.33%" y2="25%" stroke={bat ? '#0f0' : '#444'} strokeWidth="2" />
                     
                     {/* Main Bus (Middle) */}
                     <line x1="16.67%" y1="50%" x2="83.33%" y2="50%" stroke={busPowered ? '#0f0' : '#444'} strokeWidth="2" />
                     
                     {/* Gen 1 Line */}
                     <line x1="16.67%" y1="75%" x2="16.67%" y2="50%" stroke={gen1 ? '#0f0' : '#444'} strokeWidth="2" />
                     
                     {/* Gen 2 Line */}
                     <line x1="83.33%" y1="75%" x2="83.33%" y2="50%" stroke={gen2 ? '#0f0' : '#444'} strokeWidth="2" />
                     
                     {/* APU Gen Line */}
                     <line x1="50%" y1="75%" x2="50%" y2="50%" stroke={apuGen ? '#0f0' : '#444'} strokeWidth="2" />
                 </svg>

                 {/* Row 1: Battery & Standby */}
                 <div style={{ justifySelf: 'center', zIndex: 1 }}>
                     <Switch label="BAT" active={bat} onClick={() => onSystemAction('electrical', 'battery')} 
                        subLabel={t('ui.systems.on')}
                        annunciator={{ label: t('ui.systems.discharge'), active: !getSys('electrical.gen1') && bat, color: 'amber' }} 
                     />
                 </div>
                 
                 <div style={{ justifySelf: 'center', zIndex: 1 }}>
                     {/* Empty Center Top */}
                 </div>

                 <div style={{ justifySelf: 'center', zIndex: 1 }}>
                     <RotarySelector label="STBY PWR" active={getSys('electrical.stbyPower')} onClick={() => onSystemAction('electrical', 'stbyPower')} 
                        subLabel={t('ui.systems.auto')} 
                     />
                 </div>

                 {/* Row 2: Generators */}
                 <div style={{ justifySelf: 'center', zIndex: 1 }}>
                     <Switch label="GEN 1" active={getSys('electrical.gen1')} onClick={() => onSystemAction('electrical', 'gen1')}
                        annunciator={{ label: t('ui.systems.off_bus'), active: getSys('electrical.sourceOff1'), color: 'blue' }}
                        subLabel={t('ui.systems.on')}
                     />
                 </div>
                 <div style={{ justifySelf: 'center', zIndex: 1 }}>
                     <Switch label="APU GEN" active={getSys('electrical.apuGen')} onClick={() => onSystemAction('electrical', 'apuGen')}
                        annunciator={{ label: t('ui.systems.off_bus'), active: getSys('electrical.apuGenOff'), color: 'blue' }}
                        subLabel={t('ui.systems.on')}
                     />
                 </div>
                 <div style={{ justifySelf: 'center', zIndex: 1 }}>
                     <Switch label="GEN 2" active={getSys('electrical.gen2')} onClick={() => onSystemAction('electrical', 'gen2')}
                        annunciator={{ label: t('ui.systems.off_bus'), active: getSys('electrical.sourceOff2'), color: 'blue' }}
                        subLabel={t('ui.systems.on')}
                     />
                 </div>
             </div>
        </div>
    );
  };

  const ElectricalPanel = () => {
    const bat = getSys('electrical.battery');
    const batCharge = getSys('electrical.batteryCharge', 100);
    const dcVolts = getSys('electrical.dcVolts', 0);
    const acVolts = getSys('electrical.acVolts', 0);
    const acFreq = getSys('electrical.acFreq', 0);
    const acAmps = getSys('electrical.acAmps', 0);
    
    // Dynamic Generators
    const elecSys = getSys('electrical', {});
    const genKeys = Object.keys(elecSys).filter(k => k.match(/^gen\d+$/)).sort();

    // Line Logic
    const gen1On = elecSys['gen1'];
    const gen2On = elecSys['gen2'];
    const apuGenOn = getSys('electrical.apuGen');
    const busPowered = gen1On || gen2On || apuGenOn || bat;

    return (
      <div className="panel-section">
        <h4 className="panel-title">{t('ui.systems.electrics')}</h4>
        
        {/* Meters */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '10px' }}>
          <Gauge label="DC VOLTS" value={dcVolts.toFixed(1)} unit="V" max={30} color={dcVolts > 22 ? '#0f0' : '#f00'} />
          <Gauge label="DC AMPS" value={(acAmps * 0.2).toFixed(0)} unit="A" max={100} /> {/* Fake DC Amps */}
          <Gauge label="AC VOLTS" value={Math.round(acVolts)} unit="V" min={0} max={130} color={acVolts > 110 ? '#0f0' : '#fa0'} />
          <Gauge label="AC FREQ" value={Math.round(acFreq)} unit="Hz" min={380} max={420} />
        </div>

        {/* Switches with Lines */}
        <div style={{ position: 'relative', padding: '10px 0' }}>
             
             {/* SVG Overlay - Dynamic Green Lines */}
             <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.8 }}>
                 {/* Main Bus (Middle Horizontal) */}
                 <line x1="10%" y1="45%" x2="90%" y2="45%" stroke={busPowered ? '#0f0' : '#444'} strokeWidth="2" />
                 
                 {/* Battery Line (From Top) */}
                 <line x1="30%" y1="15%" x2="30%" y2="45%" stroke={bat ? '#0f0' : '#444'} strokeWidth="2" />
                 
                 {/* Standby Line (From Top) */}
                 <line x1="70%" y1="15%" x2="70%" y2="45%" stroke={getSys('electrical.stbyPower') ? '#0f0' : '#444'} strokeWidth="2" />

                 {/* Gen 1 Line (From Bottom) */}
                 <line x1="20%" y1="85%" x2="20%" y2="45%" stroke={gen1On ? '#0f0' : '#444'} strokeWidth="2" />
                 
                 {/* APU Gen Line (From Bottom Center) */}
                 <line x1="50%" y1="85%" x2="50%" y2="45%" stroke={apuGenOn ? '#0f0' : '#444'} strokeWidth="2" />
                 
                 {/* Gen 2 Line (From Bottom) */}
                 <line x1="80%" y1="85%" x2="80%" y2="45%" stroke={gen2On ? '#0f0' : '#444'} strokeWidth="2" />
             </svg>

             {/* Row 1: DC/Stby */}
             <div style={{ display: 'flex', justifyContent: 'space-evenly', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
                 <div style={{ width: '20%' }}></div> {/* Spacer to push BAT to 30% approx */}
                 <Switch label="BAT" active={bat} onClick={() => onSystemAction('electrical', 'battery')} 
                    annunciator={{ label: t('ui.systems.disch'), active: !getSys('electrical.gen1') && !getSys('electrical.gen2') && bat, color: 'amber' }} 
                 />
                 <Switch label="STBY PWR" active={getSys('electrical.stbyPower')} onClick={() => onSystemAction('electrical', 'stbyPower')} subLabel={t('ui.systems.auto')} 
                    annunciator={{ label: t('ui.systems.off'), active: !getSys('electrical.stbyPower'), color: 'amber' }}
                 />
                 <div style={{ width: '20%' }}></div>
             </div>
          
             {/* Row 2: AC Sources */}
             <div style={{ display: 'flex', justifyContent: 'space-evenly', position: 'relative', zIndex: 1 }}>
                 {/* Gen 1 */}
                 {genKeys.includes('gen1') && (
                      <Switch label="GEN 1" active={elecSys['gen1']} onClick={() => onSystemAction('electrical', 'gen1')}
                         annunciator={{ label: t('ui.systems.off_bus'), active: getSys('electrical.sourceOff1'), color: 'blue' }}
                      />
                 )}
                 
                 {/* APU Gen */}
                 <Switch label="APU GEN" active={getSys('electrical.apuGen')} onClick={() => onSystemAction('electrical', 'apuGen')}
                    annunciator={{ label: t('ui.systems.off_bus'), active: getSys('electrical.apuGenOff'), color: 'blue' }}
                    fault={getSys('electrical.apuGenOff')}
                 />
                 
                 {/* Gen 2 */}
                 {genKeys.includes('gen2') && (
                      <Switch label="GEN 2" active={elecSys['gen2']} onClick={() => onSystemAction('electrical', 'gen2')}
                         annunciator={{ label: 'OFF BUS', active: getSys('electrical.sourceOff2'), color: 'blue' }}
                      />
                 )}
                 
                 {/* Other Gens (if any, e.g. A380) - just dump them here without lines for now */}
                 {genKeys.filter(k => k !== 'gen1' && k !== 'gen2').map((key, i) => (
                      <Switch key={key} label={`GEN ${key.replace('gen', '')}`} active={elecSys[key]} onClick={() => onSystemAction('electrical', key)}
                         annunciator={{ label: t('ui.systems.off_bus'), active: getSys(`electrical.sourceOff${key.replace('gen', '')}`), color: 'blue' }}
                      />
                 ))}
             </div>
        </div>
      </div>
    );
  };

  const APUPanel = () => {
    const egt = getSys('apu.egt', 0);
    const n2 = getSys('apu.n2', 0); // Need to expose N2 in service
    const running = getSys('apu.running');
    const starting = getSys('apu.starting');
    
    return (
      <div className="panel-section">
        <h4 className="panel-title">{t('ui.systems.apu')}</h4>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
            <Gauge label="EGT" value={Math.round(egt)} unit="°C" max={800} color={egt > 700 ? '#f00' : '#0f0'} />
            <Gauge label="RPM" value={Math.round(n2)} unit="%" max={110} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <Switch label="MASTER" active={getSys('apu.master')} onClick={() => onSystemAction('apu', 'master')} 
               annunciator={{ label: t('ui.systems.fault'), active: false, color: 'amber' }}
               invertLight={true} // Blue ON when Active
               subLabel={t('ui.systems.on')}
            />
            <Switch label="START" active={getSys('apu.start')} onClick={() => onSystemAction('apu', 'start')} 
               subLabel={running ? t('ui.systems.avail') : (starting ? t('ui.systems.on') : "")} 
               annunciator={{ label: t('ui.systems.maint'), active: false, color: 'blue' }}
               invertLight={true}
               specialLabel={running ? t('ui.systems.avail') : (starting ? t('ui.systems.on') : null)}
            />
        </div>
      </div>
    );
  };

  const FuelPanel = () => {
    // Quantities
    const tankL = getSys('fuel.tanks.left', 0);
    const tankR = getSys('fuel.tanks.right', 0);
    const tankC = getSys('fuel.tanks.center', 0);
    
    // Pressures
    const pressL = getSys('fuel.pressL', 0);
    const pressR = getSys('fuel.pressR', 0);
    const pressC = getSys('fuel.pressC', 0);

    // Line Logic
    const lPumpsOn = getSys('fuel.leftPumps');
    const rPumpsOn = getSys('fuel.rightPumps');
    const cPumpsOn = getSys('fuel.centerPumps');
    const xFeedOpen = getSys('fuel.crossfeed');

    return (
      <div className="panel-section">
        <h4 className="panel-title">FUEL</h4>
        
        {/* Quantities */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', background: '#000', padding: '5px', borderRadius: '4px' }}>
            <div className="fuel-qty">
                <span>LEFT</span>
                <span className="digital">{Math.round(tankL)}</span>
            </div>
            <div className="fuel-qty">
                <span>CTR</span>
                <span className="digital">{Math.round(tankC)}</span>
            </div>
            <div className="fuel-qty">
                <span>RIGHT</span>
                <span className="digital">{Math.round(tankR)}</span>
            </div>
        </div>

        {/* Pumps */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', position: 'relative' }}>
            
            {/* SVG Overlay - Dynamic Green Lines */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.8, zIndex: 0 }}>
                {/* Left Line */}
                <line x1="16.67%" y1="10%" x2="16.67%" y2="90%" stroke={lPumpsOn ? '#0f0' : '#444'} strokeWidth="2" />
                {/* Right Line */}
                <line x1="83.33%" y1="10%" x2="83.33%" y2="90%" stroke={rPumpsOn ? '#0f0' : '#444'} strokeWidth="2" />
                {/* Center Line */}
                <line x1="50%" y1="10%" x2="50%" y2="60%" stroke={cPumpsOn ? '#0f0' : '#444'} strokeWidth="2" />
                
                {/* Crossfeed Manifold (Connecting L/R) */}
                <line x1="16.67%" y1="80%" x2="83.33%" y2="80%" stroke={xFeedOpen ? '#0f0' : '#444'} strokeWidth="3" />
            </svg>

            {/* Left Col */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                <Switch label="L PUMP 1" active={getSys('fuel.leftPumps')} onClick={() => onSystemAction('fuel', 'leftPumps')} 
                    annunciator={{ label: 'LOW PRESS', active: pressL < 10, color: 'amber' }}
                    enabled={hasPower}
                />
                <Switch label="L PUMP 2" active={getSys('fuel.leftPumps')} onClick={() => onSystemAction('fuel', 'leftPumps')} 
                     annunciator={{ label: 'LOW PRESS', active: pressL < 10, color: 'amber' }}
                     enabled={hasPower}
                />
            </div>
            
            {/* Center Col */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                <Switch label="CTR L" active={getSys('fuel.centerPumps')} onClick={() => onSystemAction('fuel', 'centerPumps')} 
                    annunciator={{ label: 'LOW PRESS', active: getSys('fuel.centerPumps') && pressC < 10, color: 'amber' }}
                    enabled={hasPower}
                />
                <Switch label="CTR R" active={getSys('fuel.centerPumps')} onClick={() => onSystemAction('fuel', 'centerPumps')} 
                     annunciator={{ label: 'LOW PRESS', active: getSys('fuel.centerPumps') && pressC < 10, color: 'amber' }}
                     enabled={hasPower}
                />
                <div style={{ marginTop: '10px' }}>
                    <Switch label="X-FEED" active={getSys('fuel.crossfeed')} onClick={() => onSystemAction('fuel', 'crossfeed')} subLabel="VALVE OPEN" 
                        annunciator={{ label: 'VALVE OPEN', active: getSys('fuel.crossfeed'), color: 'blue' }}
                        enabled={hasPower}
                    />
                </div>
            </div>

            {/* Right Col */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                <Switch label="R PUMP 1" active={getSys('fuel.rightPumps')} onClick={() => onSystemAction('fuel', 'rightPumps')} 
                    annunciator={{ label: 'LOW PRESS', active: pressR < 10, color: 'amber' }}
                    enabled={hasPower}
                />
                <Switch label="R PUMP 2" active={getSys('fuel.rightPumps')} onClick={() => onSystemAction('fuel', 'rightPumps')} 
                     annunciator={{ label: 'LOW PRESS', active: pressR < 10, color: 'amber' }}
                     enabled={hasPower}
                />
            </div>
        </div>
      </div>
    );
  };

  const PneumaticPanel = () => {
    const ductL = getSys('pressurization.ductPressL', 0);
    const ductR = getSys('pressurization.ductPressR', 0);
    const cabAlt = getSys('pressurization.cabinAlt', 0);
    const diff = getSys('pressurization.diffPressure', 0);
    
    // Dynamic Bleeds
    const pneuSys = getSys('pressurization', {});
    const bleedKeys = Object.keys(pneuSys).filter(k => k.match(/^bleed\d+$/)).sort();

    return (
      <div className="panel-section">
        <h4 className="panel-title">AIR CONDITIONING</h4>
        
        {/* Duct Pressures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <Gauge label="DUCT L" value={Math.round(ductL)} unit="PSI" max={60} />
            <Gauge label="DUCT R" value={Math.round(ductR)} unit="PSI" max={60} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {bleedKeys.map((key, i) => (
                <Switch key={key} label={`BLEED ${i+1}`} active={pneuSys[key]} onClick={() => onSystemAction('pressurization', key)} 
                    annunciator={{ label: 'OFF', active: !pneuSys[key], color: 'amber' }}
                    enabled={hasACPower || apuRunning}
                />
            ))}
            
            <Switch label="APU BLEED" active={getSys('apu.bleed')} onClick={() => onSystemAction('apu', 'bleed')} 
                annunciator={{ label: 'VALVE OPEN', active: getSys('apu.bleed') && getSys('apu.running'), color: 'blue' }}
                enabled={apuRunning}
            />
        </div>
        
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
             <Switch label="ISOLATION" active={getSys('pressurization.isolationValve')} onClick={() => onSystemAction('pressurization', 'isolationValve')} subLabel="VALVE"
                annunciator={{ label: 'OPEN', active: getSys('pressurization.isolationValve'), color: 'blue' }}
            />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '15px', borderTop: '1px solid #444', paddingTop: '10px' }}>
            <Switch label="PACK L" active={getSys('pressurization.packL')} onClick={() => onSystemAction('pressurization', 'packL')} subLabel="AUTO" enabled={hasACPower || apuRunning} />
            <Switch label="PACK R" active={getSys('pressurization.packR')} onClick={() => onSystemAction('pressurization', 'packR')} subLabel="AUTO" enabled={hasACPower || apuRunning} />
        </div>
        
        {/* Cabin Info */}
        <div style={{ marginTop: '10px', background: '#000', padding: '5px', borderRadius: '4px', textAlign: 'center', fontSize: '11px', color: '#0f0' }}>
            CAB ALT: {Math.round(cabAlt)} FT | DIFF: {diff.toFixed(1)} PSI
        </div>
      </div>
    );
  };

  const EnginePanel = () => {
    const engines = getSys('engines', {});
    const engineKeys = Object.keys(engines).filter(k => k.startsWith('eng')).sort();
    
    const StartSwitch = ({ label, value, onClick, enabled }) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '5px' }}>
            <div 
                onClick={enabled ? onClick : undefined}
                style={{ 
                    width: '40px', height: '40px', borderRadius: '50%', 
                    background: enabled ? '#333' : '#222', border: '2px solid #555',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    cursor: enabled ? 'pointer' : 'default', position: 'relative', opacity: enabled ? 1 : 0.5
                }}
            >
                <div style={{ 
                    width: '4px', height: '15px', background: '#fff', 
                    transform: value === 'GRD' ? 'rotate(-45deg)' : 
                               value === 'CONT' ? 'rotate(45deg)' : 
                               value === 'FLT' ? 'rotate(90deg)' : 'rotate(0deg)',
                    transformOrigin: 'bottom center', position: 'absolute', top: '5px'
                }} />
                <div style={{ fontSize: '8px', color: '#fff', marginTop: '45px' }}>{value}</div>
            </div>
            <div style={{ fontSize: '10px', color: '#ccc', marginTop: '5px' }}>{label}</div>
        </div>
    );

    return (
        <div className="panel-section">
            <h4 className="panel-title">ENGINES</h4>
            
            {/* Gauges */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                {engineKeys.map((key, i) => {
                    const eng = engines[key];
                    // Use flightState top-level arrays which are reliably updated from physics
                    const n2Val = flightState.engineN2 ? flightState.engineN2[i] : (eng.n2 || 0);
                    const egtVal = flightState.engineEGT ? flightState.engineEGT[i] : (eng.egt || 0);

                    return (
                        <div key={key} style={{ display: 'flex', gap: '5px' }}>
                            <Gauge label={`N2 ${i+1}`} value={Math.round(n2Val)} unit="%" max={105} />
                            <Gauge label={`EGT ${i+1}`} value={Math.round(egtVal)} unit="°C" max={1000} color={egtVal > 850 ? '#f00' : '#0f0'} />
                        </div>
                    );
                })}
            </div>

            {/* Start Switches */}
            <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #444', paddingTop: '10px', flexWrap: 'wrap' }}>
                {engineKeys.map((key, i) => {
                     const eng = engines[key];
                     return (
                        <StartSwitch
                          key={key}
                          label={`ENG ${i+1} START`}
                          value={eng.startSwitch || 'OFF'}
                          onClick={() => onSystemAction('engines', `${key}_start_toggle`)}
                          enabled={hasEngineStartAir}
                        />
                     );
                })}
            </div>

            {/* Fuel Control */}
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '10px', flexWrap: 'wrap' }}>
                {engineKeys.map((key, i) => {
                     const eng = engines[key];
                     return (
                        <Switch
                          key={key}
                          label={`ENG ${i+1}`}
                          active={eng.fuelControl}
                          onClick={() => onSystemAction('engines', `${key}_fuel`)}
                          subLabel="CUTOFF"
                          annunciator={{ label: 'RUN', active: eng.fuelControl, color: 'green' }}
                          enabled={hasEngineStartAir}
                        />
                     );
                })}
            </div>
        </div>
    );
  };

  const FirePanel = () => {
      const fire = getSys('fire', {});
      const fireHandles = Object.keys(fire).filter(k => k.match(/^eng\d+Handle$/)).sort();
      
      const Handle = ({ label, active, pulled, onClick, onDischarge }) => (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '5px' }}>
              <div onClick={onClick} style={{
                  width: '50px', height: '60px', 
                  background: pulled ? '#500' : '#333',
                  border: '2px solid #555', borderRadius: '4px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: active ? '0 0 10px #f00' : 'none',
                  transform: pulled ? 'translateY(10px)' : 'none',
                  transition: 'transform 0.2s'
              }}>
                  <div style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>{label}</div>
                  <div style={{ width: '30px', height: '30px', background: active ? '#f00' : '#550000', borderRadius: '50%', marginTop: '5px' }}></div>
                  <div style={{ fontSize: '8px', color: '#ccc' }}>{pulled ? 'PULLED' : 'IN'}</div>
              </div>

              {/* Discharge Buttons (Visible when pulled) */}
              {pulled && (
                  <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDischarge(1); }}
                        style={{ fontSize: '8px', padding: '2px', background: '#444', color: '#fff', border: '1px solid #666', cursor: 'pointer' }}
                      >
                        BTL 1
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDischarge(2); }}
                        style={{ fontSize: '8px', padding: '2px', background: '#444', color: '#fff', border: '1px solid #666', cursor: 'pointer' }}
                      >
                        BTL 2
                      </button>
                  </div>
              )}
          </div>
      );

      return (
          <div className="panel-section">
              <h4 className="panel-title">FIRE PROTECTION</h4>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  {fireHandles.map((key, i) => {
                      const engId = key.replace('Handle', ''); // eng1, eng2
                      const fireAction = key.replace(/Handle$/, '_handle');
                      return (
                        <Handle
                            key={key}
                            label={`ENG ${i+1}`}
                            active={fire[engId]} // Detect
                            pulled={fire[key]} // Handle state
                            onClick={() => onSystemAction('fire', fireAction)}
                            onDischarge={(btl) => onSystemAction('fire', `${engId}_bottle${btl}`)}
                        />
                      );
                  })}

                  <Handle
                    label="APU"
                    active={fire.apu}
                    pulled={fire.apuHandle}
                    onClick={() => onSystemAction('fire', 'apu_handle')}
                    onDischarge={(btl) => onSystemAction('fire', `apu_bottle${btl}`)}
                  />
              </div>
          </div>
      );
  };

  const HydraulicsPanel = () => {
    const hyd = getSys('hydraulics', {});
    const hydKeys = Object.keys(hyd).sort();

    return (
      <div className="panel-section">
        <h4 className="panel-title">HYDRAULICS</h4>
        {/* Dynamic Gauges Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${hydKeys.length}, 1fr)`, gap: '10px' }}>
            {hydKeys.map((key) => {
                 const label = key.replace('sys', 'SYS ').toUpperCase();
                 const sys = hyd[key];
                 return (
                    <div key={key} style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', color: '#aaa' }}>{label}</span>
                        <Gauge label="PRESS" value={Math.round(sys.pressure || 0)} unit="PSI" max={4000} />
                        <div style={{ fontSize: '10px', marginTop: '2px' }}>QTY: {Math.round(sys.qty || 0)}%</div>
                    </div>
                 );
            })}
        </div>
        
        {/* Dynamic Switches */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
             {hydKeys.map((key, i) => {
                 const sys = hyd[key];
                 const label = key.replace('sys', 'SYS ').toUpperCase();
                 
                 const engPump = (
                     <Switch key={`${key}_eng`} label={`ENG ${i+1}`} active={sys.engPump} onClick={() => onSystemAction('hydraulics', `${key}.engPump`)} 
                        annunciator={{ label: 'LOW PRESS', active: (sys.pressure || 0) < 1500, color: 'amber' }}
                        enabled={hasACPower}
                     />
                 );

                 const elecPump = (
                     <Switch key={`${key}_elec`} label={`ELEC ${i+1}`} active={sys.elecPump} onClick={() => onSystemAction('hydraulics', `${key}.elecPump`)} 
                        annunciator={{ label: 'OVERHEAT', active: false, color: 'amber' }}
                        enabled={hasACPower}
                     />
                 );

                 return (
                     <div key={key} style={{ display: 'flex', gap: '5px' }}>
                         {engPump}
                         {elecPump}
                     </div>
                 );
             })}
        </div>
      </div>
    );
  };

  const LightsPanel = () => {
    return (
      <div className="panel-section">
        <h4 className="panel-title">EXT LIGHTS</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', justifyItems: 'center' }}>
            <Switch label="LANDING" active={getSys('lighting.landing')} onClick={() => onSystemAction('lighting', 'landing')} invertLight={true} subLabel="ON" enabled={hasACPower} />
            <Switch label="TAXI" active={getSys('lighting.taxi')} onClick={() => onSystemAction('lighting', 'taxi')} invertLight={true} subLabel="ON" enabled={hasACPower} />
            <Switch label="STROBE" active={getSys('lighting.strobe')} onClick={() => onSystemAction('lighting', 'strobe')} invertLight={true} subLabel="ON" enabled={hasACPower} />
            <Switch label="BEACON" active={getSys('lighting.beacon')} onClick={() => onSystemAction('lighting', 'beacon')} invertLight={true} subLabel="ON" enabled={hasACPower} />
            <Switch label="NAV" active={getSys('lighting.nav')} onClick={() => onSystemAction('lighting', 'nav')} invertLight={true} subLabel="ON" enabled={hasACPower} />
            <Switch label="LOGO" active={getSys('lighting.logo')} onClick={() => onSystemAction('lighting', 'logo')} invertLight={true} subLabel="ON" enabled={hasACPower} />
            <Switch label="WING" active={getSys('lighting.wing')} onClick={() => onSystemAction('lighting', 'wing')} invertLight={true} subLabel="ON" enabled={hasACPower} />
        </div>
      </div>
    );
  };

  const ADIRSPanel = () => {
    const ir1 = getSys('adirs.ir1', 'OFF');
    const ir2 = getSys('adirs.ir2', 'OFF');
    const aligned = getSys('adirs.aligned', false);
    const alignState = getSys('adirs.alignState', 0);
    const onBat = getSys('adirs.onBat', false);
    
    const toggleIRS = (id) => {
        const current = getSys(`adirs.${id}`, 'OFF');
        const next = current === 'OFF' ? 'NAV' : 'OFF';
        onSystemAction('adirs', id, next);
    };

    return (
      <div className="panel-section">
        <h4 className="panel-title">ADIRS</h4>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
            <Switch label="IRS 1" active={ir1 === 'NAV'} onClick={() => toggleIRS('ir1')} 
               subLabel="NAV"
               annunciator={{ label: 'ON BAT', active: onBat, color: 'amber' }}
               enabled={hasPower}
            />
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '10px', color: '#ccc', marginBottom: '4px' }}>ALIGN</div>
                {aligned ? (
                     <div style={{ color: '#0f0', fontWeight: 'bold' }}>RDY</div>
                ) : (
                    ir1 !== 'OFF' || ir2 !== 'OFF' ? (
                        <div style={{ width: '40px', background: '#333', height: '6px', borderRadius: '3px' }}>
                             <div style={{ width: `${alignState}%`, background: '#fa0', height: '100%', borderRadius: '3px' }}></div>
                        </div>
                    ) : <div style={{ color: '#444' }}>OFF</div>
                )}
            </div>

            <Switch label="IRS 2" active={ir2 === 'NAV'} onClick={() => toggleIRS('ir2')} 
               subLabel="NAV"
               annunciator={{ label: 'ON BAT', active: onBat, color: 'amber' }}
               enabled={hasPower}
            />
        </div>
      </div>
    );
  };

  const CommPanel = () => {
      const comms = getSys('comms', {});
      const transponder = getSys('transponder', {});
      const vhf1 = comms.vhf1 || { active: '118.500', stby: '121.500' };
      const vhf2 = comms.vhf2 || { active: '121.900', stby: '119.100' };

      const RadioDisplay = ({ label, freq, onSwap }) => (
          <div style={{ background: '#000', padding: '4px', borderRadius: '4px', border: '1px solid #444', marginBottom: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontSize: '9px', color: '#888', fontWeight: 'bold' }}>{label}</span>
                  <button onClick={onSwap} style={{ 
                      fontSize: '8px', background: '#333', border: '1px solid #555', 
                      color: '#fff', cursor: 'pointer', padding: '1px 4px', borderRadius: '2px' 
                  }}>
                    SWAP
                  </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '14px', fontFamily: 'monospace', color: '#ff9900', fontWeight: 'bold', letterSpacing: '1px' }}>{freq.active}</div>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#cc7700', opacity: 0.8 }}>{freq.stby}</div>
              </div>
          </div>
      );

      return (
          <div className="panel-section">
              <h4 className="panel-title">COMM / XPDR</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <RadioDisplay label="VHF 1" freq={vhf1} onSwap={() => onSystemAction('comms', 'swap_vhf1')} />
                  <RadioDisplay label="VHF 2" freq={vhf2} onSwap={() => onSystemAction('comms', 'swap_vhf2')} />
                  
                  {/* Transponder */}
                  <div style={{ background: '#000', padding: '4px', borderRadius: '4px', border: '1px solid #444', marginTop: '2px' }}>
                       <div style={{ fontSize: '9px', color: '#888', marginBottom: '2px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                           <span>XPDR</span>
                           <span style={{ color: transponder.ident ? '#0f0' : '#444' }}>IDENT</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <div style={{ 
                               fontSize: '14px', fontFamily: 'monospace', color: '#0f0', fontWeight: 'bold', 
                               background: '#111', padding: '2px 4px', border: '1px solid #333', letterSpacing: '1px' 
                           }}>
                               {transponder.code || '1200'}
                           </div>
                           <div style={{ transform: 'scale(0.8)' }}>
                               <RotarySelector label="MODE" active={transponder.mode === 'TA/RA'} onClick={() => {
                                   const modes = ['STBY', 'ALT', 'TA/RA'];
                                   const currentIdx = modes.indexOf(transponder.mode || 'STBY');
                                   const nextMode = modes[(currentIdx + 1) % modes.length];
                                   onSystemAction('transponder', 'mode', nextMode);
                               }} subLabel={transponder.mode || 'STBY'} />
                           </div>
                       </div>
                  </div>
              </div>
          </div>
      );
  };

  const IceRainPanel = () => {
      return (
          <div className="panel-section">
              <h4 className="panel-title">ICE & RAIN</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
                  <Switch label="WING" active={getSys('ice.wingAntiIce')} onClick={() => onSystemAction('ice', 'wingAntiIce')} 
                      annunciator={{ label: 'VALVE OPEN', active: getSys('ice.wingAntiIce'), color: 'blue' }}
                      invertLight={true} subLabel="ON"
                  />
                  <Switch label="ENG 1" active={getSys('ice.eng1AntiIce')} onClick={() => onSystemAction('ice', 'eng1AntiIce')} 
                      annunciator={{ label: 'VALVE OPEN', active: getSys('ice.eng1AntiIce'), color: 'blue' }}
                      invertLight={true} subLabel="ON"
                  />
                  <Switch label="ENG 2" active={getSys('ice.eng2AntiIce')} onClick={() => onSystemAction('ice', 'eng2AntiIce')} 
                      annunciator={{ label: 'VALVE OPEN', active: getSys('ice.eng2AntiIce'), color: 'blue' }}
                      invertLight={true} subLabel="ON"
                  />
                  <div style={{ width: '100%', height: '5px' }}></div>
                  <Switch label="PROBE" active={getSys('ice.probeHeat', true)} onClick={() => onSystemAction('ice', 'probeHeat')} 
                  />
              </div>
          </div>
      );
  };

  const B737IcePanel = () => {
      return (
          <div className="panel-section">
              <h4 className="panel-title">WINDOW HEAT</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '8px' }}>
                  <Switch label="L SIDE" active={true} onClick={() => {}} subLabel="ON" />
                  <Switch label="L FWD" active={true} onClick={() => {}} subLabel="ON" />
                  <Switch label="R FWD" active={true} onClick={() => {}} subLabel="ON" />
                  <Switch label="R SIDE" active={true} onClick={() => {}} subLabel="ON" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '8px', borderTop: '1px solid #444', paddingTop: '4px' }}>
                  <Switch label="PROBE A" active={getSys('ice.probeHeat', true)} onClick={() => onSystemAction('ice', 'probeHeat')} subLabel="ON" />
                  <Switch label="PROBE B" active={getSys('ice.probeHeat', true)} onClick={() => onSystemAction('ice', 'probeHeat')} subLabel="ON" />
              </div>
              <h4 className="panel-title" style={{ marginTop: '4px' }}>WING / ENG ANTI-ICE</h4>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <Switch label="WING" active={getSys('ice.wingAntiIce')} onClick={() => onSystemAction('ice', 'wingAntiIce')} 
                      annunciator={{ label: 'VALVE OPEN', active: getSys('ice.wingAntiIce'), color: 'blue' }}
                  />
                  <Switch label="ENG 1" active={getSys('ice.eng1AntiIce')} onClick={() => onSystemAction('ice', 'eng1AntiIce')} 
                      annunciator={{ label: 'COWL VALVE', active: getSys('ice.eng1AntiIce'), color: 'blue' }}
                  />
                  <Switch label="ENG 2" active={getSys('ice.eng2AntiIce')} onClick={() => onSystemAction('ice', 'eng2AntiIce')} 
                      annunciator={{ label: 'COWL VALVE', active: getSys('ice.eng2AntiIce'), color: 'blue' }}
                  />
              </div>
          </div>
      );
  };

  const B737CabinPressPanel = () => {
      return (
          <div className="panel-section" style={{ position: 'relative' }}>
              <h4 className="panel-title">CABIN PRESS</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <Gauge label="DIFF PRESS" value={0} unit="PSI" max={10} />
                  <Gauge label="CAB ALT" value={0} unit="FT" max={40000} />
                  <Gauge label="CLIMB" value={0} unit="FT/MIN" max={4000} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                  <RotarySelector label="FLT ALT" active={false} onClick={() => {}} subLabel="35000" />
                  <RotarySelector label="LAND ALT" active={false} onClick={() => {}} subLabel="50" />
                  <RotarySelector label="MODE" active={true} onClick={() => {}} subLabel="AUTO" />
              </div>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-15deg)', 
                  border: '2px solid red', color: 'red', padding: '2px 5px', fontSize: '14px', fontWeight: 'bold', pointerEvents: 'none', opacity: 0.7 
              }}>INOP</div>
          </div>
      );
  };

  const B737MiscPanel = () => {
      return (
          <div className="panel-section">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                      <h4 className="panel-title">EQUIP COOLING</h4>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <Switch label="SUPPLY" active={true} onClick={() => {}} subLabel="NORM" />
                          <Switch label="EXHAUST" active={true} onClick={() => {}} subLabel="NORM" />
                      </div>
                      <div style={{ textAlign: 'center', marginTop: '5px', border: '1px solid red', color: 'red', fontSize: '10px', transform: 'rotate(-5deg)', opacity: 0.7 }}>INOP</div>
                  </div>
                  <div>
                      <h4 className="panel-title">EMER LIGHTS</h4>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <Switch label="EMER LTS" active={getSys('lighting.emergencyLights', true)} onClick={() => onSystemAction('lighting', 'emergencyLights')} 
                              subLabel="ARM"
                              annunciator={{ label: 'NOT ARMED', active: !getSys('lighting.emergencyLights', true), color: 'amber' }}
                          />
                      </div>
                  </div>
              </div>
              <div style={{ borderTop: '1px solid #444', marginTop: '10px', paddingTop: '5px' }}>
                  <h4 className="panel-title">SIGNS</h4>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                      <Switch label="SEAT BELTS" active={getSys('signs.seatBelts')} onClick={() => onSystemAction('signs', 'seatBelts')} 
                          subLabel="ON" invertLight={true}
                      />
                      <Switch label="NO SMOKE" active={getSys('signs.noSmoking')} onClick={() => onSystemAction('signs', 'noSmoking')} 
                          subLabel="ON" invertLight={true}
                      />
                      <Switch label="ATTEND" active={false} onClick={() => {}} subLabel="CALL" />
                      <Switch label="GRD CALL" active={false} onClick={() => {}} subLabel="CALL" />
                  </div>
              </div>
          </div>
      );
  };

  const WipersPanel = () => {
      return (
          <div className="panel-section">
              <h4 className="panel-title">WIPERS</h4>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <Switch label="L WIPER" active={getSys('wipers.left')} onClick={() => onSystemAction('wipers', 'left')} />
                  <Switch label="R WIPER" active={getSys('wipers.right')} onClick={() => onSystemAction('wipers', 'right')} />
              </div>
          </div>
      );
  };

  const B737FlightControlPanel = () => {
      return (
          <div className="panel-section">
              <h4 className="panel-title">FLT CONTROL</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', justifyItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '8px', color: '#aaa', marginBottom: '2px' }}>FLT CONTROL</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                          <Switch label="A" active={false} onClick={() => {}} subLabel="STBY RUD" annunciator={{ label: 'LOW PRESS', active: false, color: 'amber' }} />
                          <Switch label="B" active={false} onClick={() => {}} subLabel="STBY RUD" annunciator={{ label: 'LOW PRESS', active: false, color: 'amber' }} />
                      </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '8px', color: '#aaa', marginBottom: '2px' }}>SPOILER</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                          <Switch label="A" active={false} onClick={() => {}} />
                          <Switch label="B" active={false} onClick={() => {}} />
                      </div>
                  </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '5px', gap: '10px' }}>
                  <Switch label="YAW DAMPER" active={getSys('flightControls.yawDamper', true)} onClick={() => onSystemAction('flightControls', 'yawDamper')} 
                      annunciator={{ label: 'YAW DAMPER', active: !getSys('flightControls.yawDamper', true), color: 'amber' }}
                  />
                  <Switch label="ALT FLAPS" active={false} onClick={() => {}} subLabel="ARM" />
              </div>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-15deg)', 
                  border: '2px solid red', color: 'red', padding: '2px 5px', fontSize: '14px', fontWeight: 'bold', pointerEvents: 'none', opacity: 0.7 
              }}>INOP</div>
          </div>
      );
  };

  const B737NavPanel = () => {
      return (
          <div className="panel-section">
              <h4 className="panel-title">NAVIGATION</h4>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <RotarySelector label="VHF NAV" active={false} onClick={() => {}} subLabel="NORMAL" />
                  <RotarySelector label="IRS" active={false} onClick={() => {}} subLabel="NORMAL" />
                  <RotarySelector label="FMC" active={false} onClick={() => {}} subLabel="NORMAL" />
                  <RotarySelector label="DISPLAYS" active={false} onClick={() => {}} subLabel="AUTO" />
              </div>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-15deg)', 
                  border: '2px solid red', color: 'red', padding: '2px 5px', fontSize: '14px', fontWeight: 'bold', pointerEvents: 'none', opacity: 0.7 
              }}>INOP</div>
          </div>
      );
  };

  const MiscPanel = () => {
      return (
          <div className="panel-section">
              <h4 className="panel-title">MISC</h4>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <Switch label="EMER LTS" active={getSys('lighting.emergencyLights', true)} onClick={() => onSystemAction('lighting', 'emergencyLights')}
                      subLabel="ARM"
                      annunciator={{ label: 'OFF', active: !getSys('lighting.emergencyLights', true), color: 'amber' }}
                  />
                  <Switch label="SEAT BELTS" active={getSys('signs.seatBelts')} onClick={() => onSystemAction('signs', 'seatBelts')}
                      subLabel="ON" invertLight={true}
                  />
                  <Switch label="NO SMOKE" active={getSys('signs.noSmoking')} onClick={() => onSystemAction('signs', 'noSmoking')}
                      subLabel="ON" invertLight={true}
                  />
              </div>
          </div>
      );
  };

  const GuardedSwitch = ({ label, active, onClick, subLabel, annunciator, enabled = true }) => (
      <div className="b737-guarded-control">
          <div className="b737-switch-guard" />
          <Switch label={label} active={active} onClick={onClick} subLabel={subLabel} annunciator={annunciator} enabled={enabled} />
      </div>
  );

  const SchematicLines = ({ type }) => (
      <svg className={`b737-schematic-lines b737-schematic-${type}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {type === 'fuel' && (
              <>
                  <rect x="6" y="10" width="22" height="20" rx="1.5" className="b737-schematic-frame" />
                  <rect x="36" y="6" width="28" height="26" rx="1.5" className="b737-schematic-frame" />
                  <rect x="72" y="10" width="22" height="20" rx="1.5" className="b737-schematic-frame" />
                  <path d="M17 30 L17 68" />
                  <path d="M50 32 L50 68" />
                  <path d="M83 30 L83 68" />
                  <path d="M17 50 L83 50" />
                  <path d="M17 68 L83 68" />
                  <path d="M50 50 L50 82" />
                  <circle cx="50" cy="50" r="3.2" />
                  <circle cx="50" cy="68" r="3.2" />
                  <path d="M28 20 L36 20" className="b737-schematic-muted" />
                  <path d="M64 20 L72 20" className="b737-schematic-muted" />
                  <path d="M17 68 L8 78" className="b737-schematic-muted" />
                  <path d="M83 68 L92 78" className="b737-schematic-muted" />
              </>
          )}
          {type === 'bleed' && (
              <>
                  <path d="M16 28 L84 28" />
                  <path d="M16 28 L16 72" />
                  <path d="M84 28 L84 72" />
                  <path d="M50 28 L50 72" />
                  <path d="M16 72 L50 72 L84 72" />
                  <circle cx="50" cy="50" r="4" />
              </>
          )}
          {type === 'ice' && (
              <>
                  <path d="M28 26 L72 26" />
                  <path d="M28 50 L72 50" />
                  <path d="M28 74 L72 74" />
                  <path d="M50 26 L50 74" />
              </>
          )}
      </svg>
  );

  const AnalogFace = ({ label, value = 0, unit = '', max = 100 }) => {
      const clamped = Math.max(0, Math.min(1, value / max));
      return (
          <div className="b737-analog-face">
              <div className="b737-analog-needle" style={{ transform: `rotate(${-120 + clamped * 240}deg)` }} />
              <div className="b737-analog-label">{label}</div>
              <div className="b737-analog-value">{Math.round(value)}{unit}</div>
          </div>
      );
  };

  const MiniPush = ({ label }) => (
      <div className="b737-mini-push">
          <span>{label}</span>
      </div>
  );

  const B737APUModule = () => (
      <div className="b737-upper-plate b737-upper-apu">
          <div className="b737-local-label">APU</div>
          <div className="b737-upper-dense-row b737-apu-row">
              <GuardedSwitch label="MASTER" active={getSys('apu.master')} onClick={() => onSystemAction('apu', 'master')} subLabel="ON"
                  annunciator={{ label: 'AVAIL', active: getSys('apu.running'), color: 'blue' }} />
              <Switch label="START" active={getSys('apu.start')} onClick={() => onSystemAction('apu', 'start')} subLabel="START"
                  annunciator={{ label: 'LOW OIL', active: false, color: 'amber' }} enabled={getSys('apu.master')} />
              <Annunciator label="GEN" active={getSys('electrical.apuGen')} color="blue" />
              <Annunciator label="BLEED" active={getSys('apu.bleed')} color="blue" />
          </div>
      </div>
  );

  const B737SupportModule = () => (
      <div className="b737-topology-upper">
          <div className="b737-upper-plate b737-upper-left">
              <div className="b737-local-label">FLT CONTROL</div>
              <div className="b737-upper-dense-row b737-upper-dense-row-flight">
                  <Switch label="YAW" active={getSys('flightControls.yawDamper', true)} onClick={() => onSystemAction('flightControls', 'yawDamper')}
                      annunciator={{ label: 'DAMPER', active: !getSys('flightControls.yawDamper', true), color: 'amber' }} />
                  <div className="b737-top-annunciator-stack">
                      <Annunciator label="LOW QTY" active={false} color="amber" />
                      <Annunciator label="FEEL DIFF" active={false} color="amber" />
                      <Annunciator label="AUTO SLAT" active={false} color="amber" />
                  </div>
                  <RotarySelector label="FLT" active={false} onClick={() => {}} subLabel="TEST" />
              </div>
          </div>
          <div className="b737-upper-plate b737-upper-nav">
              <div className="b737-local-label">NAV</div>
              <div className="b737-upper-dense-row b737-nav-row">
                  <RotarySelector label="IRS" active={false} onClick={() => {}} subLabel="NAV" />
                  <RotarySelector label="DSPLY" active={false} onClick={() => {}} subLabel="AUTO" />
              </div>
              <div className="b737-process-status b737-top-status-tight">
                  <Annunciator label="ALIGN" active={false} color="amber" />
                  <Annunciator label="DC FAIL" active={false} color="amber" />
              </div>
          </div>
          <div className="b737-upper-slot">
              <div className="b737-slot-plate">
                  <div className="b737-local-label">CALL</div>
                  <Annunciator label="ATTEND" active={false} color="blue" />
                  <MiniPush label="PUSH" />
              </div>
          </div>
          <div className="b737-upper-plate b737-upper-ops">
              <div className="b737-local-label">UTILITY</div>
              <div className="b737-upper-dense-row b737-utility-row">
                  <Switch label="SEAT" active={getSys('signs.seatBelts')} onClick={() => onSystemAction('signs', 'seatBelts')} subLabel="BELTS" invertLight={true} />
                  <Switch label="NO" active={getSys('signs.noSmoking')} onClick={() => onSystemAction('signs', 'noSmoking')} subLabel="SMOKE" invertLight={true} />
                  <Annunciator label="AUTO" active={false} color="blue" />
                  <MiniPush label="SERV" />
                  <MiniPush label="RST" />
              </div>
          </div>
          <div className="b737-upper-plate b737-upper-test">
              <div className="b737-local-label">CVR / TEST</div>
              <div className="b737-upper-test-grid">
                  <Annunciator label="TEST" active={false} color="amber" />
                  <Annunciator label="ERASE" active={false} color="amber" />
                  <MiniPush label="CVR" />
                  <MiniPush label="TEST" />
              </div>
          </div>
      </div>
  );

  const B737ElectricalWorkflowModule = () => {
      const dcVolts = getSys('electrical.dcVolts', 0);
      const acVolts = getSys('electrical.acVolts', 0);
      const bat = getSys('electrical.battery');
      return (
          <div className="b737-module b737-electrical-module b737-electrical-structured-module">
              <div className="b737-module-title">ELECTRICAL</div>
              {renderB737ChildElement('mainElectrical', 'electricalMeters', (
                  <div className="b737-meter-strip b737-electrical-meter-strip">
                      <span>DC {Math.round(dcVolts)}V</span>
                      <span>AC {Math.round(acVolts)}V</span>
                      <span>400HZ</span>
                  </div>
              ))}
              {renderB737ChildElement('mainElectrical', 'electricalStatus', (
                  <div className="b737-electrical-status-board">
                      <div className="b737-process-status b737-annunciator-strip b737-electrical-status-strip">
                          <Annunciator label="BAT DISCH" active={!getSys('electrical.gen1') && bat} color="amber" />
                          <Annunciator label="SOURCE OFF" active={getSys('electrical.sourceOff1') || getSys('electrical.sourceOff2')} color="blue" />
                          <Annunciator label="APU AVAIL" active={getSys('apu.running')} color="blue" />
                      </div>
                      <div className="b737-electrical-bus-legend">
                          <span>GEN 1</span>
                          <span>STBY PWR</span>
                          <span>APU GEN</span>
                          <span>GEN 2</span>
                      </div>
                  </div>
              ))}
              {renderB737ChildElement('mainElectrical', 'electricalControls', (
                  <div className="b737-electrical-lower-grid">
                      {renderB737ControlElement('electricalControls', 'elec-bat', (
                          <Switch label="BAT" active={bat} onClick={() => onSystemAction('electrical', 'battery')} subLabel="ON" annunciator={{ label: 'DISCH', active: !getSys('electrical.gen1') && bat, color: 'amber' }} />
                      ))}
                      {renderB737ControlElement('electricalControls', 'elec-stby', (
                          <Switch label="STBY" active={getSys('electrical.stbyPower')} onClick={() => onSystemAction('electrical', 'stbyPower')} subLabel="PWR" annunciator={{ label: 'AUTO', active: getSys('electrical.stbyPower'), color: 'blue' }} />
                      ))}
                      {renderB737ControlElement('electricalControls', 'elec-gen1', (
                          <Switch label="GEN 1" active={getSys('electrical.gen1')} onClick={() => onSystemAction('electrical', 'gen1')} subLabel="ON" annunciator={{ label: 'OFF BUS', active: getSys('electrical.sourceOff1'), color: 'blue' }} />
                      ))}
                      {renderB737ControlElement('electricalControls', 'elec-apugen', (
                          <Switch label="APU GEN" active={getSys('electrical.apuGen')} onClick={() => onSystemAction('electrical', 'apuGen')} subLabel="ON" annunciator={{ label: 'OFF BUS', active: getSys('electrical.apuGenOff'), color: 'blue' }} />
                      ))}
                      {renderB737ControlElement('electricalControls', 'elec-gen2', (
                          <Switch label="GEN 2" active={getSys('electrical.gen2')} onClick={() => onSystemAction('electrical', 'gen2')} subLabel="ON" annunciator={{ label: 'OFF BUS', active: getSys('electrical.sourceOff2'), color: 'blue' }} />
                      ))}
                  </div>
              ))}
          </div>
      );
  };

  const B737FuelWorkflowModule = () => {
      const tankL = getSys('fuel.tanks.left', 0);
      const tankR = getSys('fuel.tanks.right', 0);
      const tankC = getSys('fuel.tanks.center', 0);
      return (
          <div className="b737-module b737-fuel-module b737-schematic-panel b737-fuel-structured-module">
              <div className="b737-module-title">FUEL</div>
              {renderB737ChildElement('mainFuel', 'fuelQty', (
                  <div className="b737-fuel-qty-row b737-fuel-qty-structured">
                      <span>{Math.round(tankL)}</span><span>{Math.round(tankC)}</span><span>{Math.round(tankR)}</span>
                  </div>
              ))}
              {renderB737ChildElement('mainFuel', 'fuelSchematic', (
                  <div className="b737-fuel-schematic-shell">
                      {renderB737ControlElement('fuelSchematic', 'fuel-lines', <SchematicLines type="fuel" />)}
                  </div>
              ))}
              {renderB737ChildElement('mainFuel', 'fuelControls', (
                  <div className="b737-fuel-control-lattice">
                      {renderB737ControlElement('fuelControls', 'fuel-lfwd', (
                          <Switch label="L FWD" active={getSys('fuel.leftPumps')} onClick={() => onSystemAction('fuel', 'leftPumps')} enabled={hasPower} annunciator={{ label: 'LOW PRESS', active: getSys('fuel.pressL', 0) < 10, color: 'amber' }} />
                      ))}
                      {renderB737ControlElement('fuelControls', 'fuel-ctrl', (
                          <Switch label="CTR L" active={getSys('fuel.centerPumps')} onClick={() => onSystemAction('fuel', 'centerPumps')} enabled={hasPower} annunciator={{ label: 'LOW PRESS', active: getSys('fuel.centerPumps') && getSys('fuel.pressC', 0) < 10, color: 'amber' }} />
                      ))}
                      {renderB737ControlElement('fuelControls', 'fuel-ctrr', (
                          <Switch label="CTR R" active={getSys('fuel.centerPumps')} onClick={() => onSystemAction('fuel', 'centerPumps')} enabled={hasPower} annunciator={{ label: 'LOW PRESS', active: getSys('fuel.centerPumps') && getSys('fuel.pressC', 0) < 10, color: 'amber' }} />
                      ))}
                      {renderB737ControlElement('fuelControls', 'fuel-rfwd', (
                          <Switch label="R FWD" active={getSys('fuel.rightPumps')} onClick={() => onSystemAction('fuel', 'rightPumps')} enabled={hasPower} annunciator={{ label: 'LOW PRESS', active: getSys('fuel.pressR', 0) < 10, color: 'amber' }} />
                      ))}
                      {renderB737ControlElement('fuelControls', 'fuel-laft', (
                          <Switch label="L AFT" active={getSys('fuel.leftPumps')} onClick={() => onSystemAction('fuel', 'leftPumps')} enabled={hasPower} annunciator={{ label: 'LOW PRESS', active: getSys('fuel.pressL', 0) < 10, color: 'amber' }} />
                      ))}
                      {renderB737ControlElement('fuelControls', 'fuel-xfeed', (
                          <RotarySelector label="XFEED" active={getSys('fuel.crossfeed')} onClick={() => onSystemAction('fuel', 'crossfeed')} subLabel="VALVE" />
                      ))}
                      {renderB737ControlElement('fuelControls', 'fuel-raft', (
                          <Switch label="R AFT" active={getSys('fuel.rightPumps')} onClick={() => onSystemAction('fuel', 'rightPumps')} enabled={hasPower} annunciator={{ label: 'LOW PRESS', active: getSys('fuel.pressR', 0) < 10, color: 'amber' }} />
                      ))}
                  </div>
              ))}
          </div>
      );
  };

  const B737HydraulicWorkflowModule = () => (
      <div className="b737-module b737-hydraulic-module">
          <div className="b737-local-label">HYD</div>
          {renderB737ChildElement('mainHydraulics', 'hydGauges', (
              <div className="b737-gauge-row b737-hyd-top-row">
                  {renderB737ControlElement('hydGauges', 'hyd-gauge-a', (
                      <Gauge label="A" value={getSys('hydraulics.pressureA', 0)} unit="PSI" max={3000} />
                  ))}
                  {renderB737ControlElement('hydGauges', 'hyd-gauge-b', (
                      <Gauge label="B" value={getSys('hydraulics.pressureB', 0)} unit="PSI" max={3000} />
                  ))}
                  {renderB737ControlElement('hydGauges', 'hyd-qty', (
                      <AnalogFace label="QTY" value={getSys('hydraulics.quantityA', 80)} unit="%" max={100} />
                  ))}
              </div>
          ))}
          {renderB737ChildElement('mainHydraulics', 'hydStatus', (
              <div className="b737-process-status b737-hyd-status-row">
                  <Annunciator label="LOW PRESS" active={getSys('hydraulics.pressureA', 0) < 1000} color="amber" />
                  <Annunciator label="OVERHEAT" active={false} color="amber" />
                  <Annunciator label="LOW PRESS" active={getSys('hydraulics.pressureB', 0) < 1000} color="amber" />
                  <Annunciator label="LOW QTY" active={false} color="amber" />
              </div>
          ))}
          {renderB737ChildElement('mainHydraulics', 'hydControls', (
              <div className="b737-hyd-switches b737-hyd-switch-row">
                  {renderB737ControlElement('hydControls', 'hyd-elec1', (
                      <Switch label="ELEC 1" active={getSys('hydraulics.elecPump1')} onClick={() => onSystemAction('hydraulics', 'elecPump1')} annunciator={{ label: 'LOW', active: getSys('hydraulics.pressureA', 0) < 1000, color: 'amber' }} enabled={hasPower} />
                  ))}
                  {renderB737ControlElement('hydControls', 'hyd-elec2', (
                      <Switch label="ELEC 2" active={getSys('hydraulics.elecPump2')} onClick={() => onSystemAction('hydraulics', 'elecPump2')} annunciator={{ label: 'LOW', active: getSys('hydraulics.pressureB', 0) < 1000, color: 'amber' }} enabled={hasPower} />
                  ))}
              </div>
          ))}
      </div>
  );

  const B737PneumaticWorkflowModule = () => {
      const pneuSys = getSys('pressurization', {});
      const bleedKeys = Object.keys(pneuSys).filter(k => k.match(/^bleed\d+$/)).sort();
      return (
          <div className="b737-module b737-pneumatic-module b737-schematic-panel">
              <div className="b737-module-title">BLEED AIR / PNEUMATIC</div>
              {renderB737ChildElement('mainPneumatic', 'pneuGauges', (
                  <div className="b737-gauge-row b737-bleed-top-row">
                      {renderB737ControlElement('pneuGauges', 'pneu-ductl', (
                          <Gauge label="DUCT L" value={Math.round(getSys('pressurization.ductPressL', 0))} unit="PSI" max={60} />
                      ))}
                      {renderB737ControlElement('pneuGauges', 'pneu-ductr', (
                          <Gauge label="DUCT R" value={Math.round(getSys('pressurization.ductPressR', 0))} unit="PSI" max={60} />
                      ))}
                  </div>
              ))}
              {renderB737ChildElement('mainPneumatic', 'pneuStatus', (
                  <div className="b737-process-status b737-annunciator-strip b737-bleed-status-row">
                      <Annunciator label="BLEED OFF" active={bleedKeys.some((key) => !pneuSys[key])} color="amber" />
                      <Annunciator label="PACK TRIP" active={false} color="amber" />
                      <Annunciator label="ISOL OPEN" active={getSys('pressurization.isolationValve')} color="blue" />
                  </div>
              ))}
              {renderB737ChildElement('mainPneumatic', 'pneuSchematic', (
                  renderB737ControlElement('pneuSchematic', 'pneu-lines', <SchematicLines type="bleed" />)
              ))}
              {renderB737ChildElement('mainPneumatic', 'pneuControls', (
                  <div className="b737-bleed-grid b737-bleed-grid-structured">
                      {bleedKeys[0] && renderB737ControlElement('pneuControls', 'pneu-eng1', (
                          <Switch label="ENG 1 BLEED" active={pneuSys[bleedKeys[0]]} onClick={() => onSystemAction('pressurization', bleedKeys[0])} annunciator={{ label: 'OFF', active: !pneuSys[bleedKeys[0]], color: 'amber' }} enabled={hasACPower || apuRunning} />
                      ))}
                      {bleedKeys[1] && renderB737ControlElement('pneuControls', 'pneu-eng2', (
                          <Switch label="ENG 2 BLEED" active={pneuSys[bleedKeys[1]]} onClick={() => onSystemAction('pressurization', bleedKeys[1])} annunciator={{ label: 'OFF', active: !pneuSys[bleedKeys[1]], color: 'amber' }} enabled={hasACPower || apuRunning} />
                      ))}
                      {renderB737ControlElement('pneuControls', 'pneu-apu', (
                          <Switch label="APU BLEED" active={getSys('apu.bleed')} onClick={() => onSystemAction('apu', 'bleed')} annunciator={{ label: 'VALVE', active: getSys('apu.bleed') && getSys('apu.running'), color: 'blue' }} enabled={apuRunning} />
                      ))}
                      {renderB737ControlElement('pneuControls', 'pneu-packl', (
                          <Switch label="PACK L" active={getSys('pressurization.packL')} onClick={() => onSystemAction('pressurization', 'packL')} subLabel="AUTO" enabled={hasACPower || apuRunning} />
                      ))}
                      {renderB737ControlElement('pneuControls', 'pneu-isol', (
                          <Switch label="ISOL" active={getSys('pressurization.isolationValve')} onClick={() => onSystemAction('pressurization', 'isolationValve')} subLabel="VLV" annunciator={{ label: 'OPEN', active: getSys('pressurization.isolationValve'), color: 'blue' }} />
                      ))}
                      {renderB737ControlElement('pneuControls', 'pneu-packr', (
                          <Switch label="PACK R" active={getSys('pressurization.packR')} onClick={() => onSystemAction('pressurization', 'packR')} subLabel="AUTO" enabled={hasACPower || apuRunning} />
                      ))}
                  </div>
              ))}
          </div>
      );
  };

  const B737EnvironmentWorkflowModule = () => (
      <div className="b737-module b737-environment-module">
          <div className="b737-module-title">AIR CONDITIONING / TEMPERATURE</div>
          <div className="b737-knob-bank b737-air-top-row">
              <RotarySelector label="FLT DECK" active={true} onClick={() => {}} subLabel="AUTO" />
              <RotarySelector label="FWD CABIN" active={true} onClick={() => {}} subLabel="AUTO" />
              <RotarySelector label="AFT CABIN" active={true} onClick={() => {}} subLabel="AUTO" />
              <RotarySelector label="TRIM AIR" active={getSys('pressurization.trimAir', true)} onClick={() => onSystemAction('pressurization', 'trimAir')} subLabel="ON" />
          </div>
          <div className="b737-process-status b737-annunciator-strip b737-air-status-row">
              <Annunciator label="PACK TRIP" active={false} color="amber" />
              <Annunciator label="ZONE TEMP" active={false} color="amber" />
              <Annunciator label="RAM DOOR" active={false} color="blue" />
          </div>
      </div>
  );

  const B737PressurizationWorkflowModule = () => (
      <div className="b737-module b737-pressurization-module">
          <div className="b737-module-title">PRESSURIZATION / OXYGEN</div>
          <div className="b737-gauge-row b737-press-gauges b737-press-top-row">
              <Gauge label="CAB ALT" value={Math.round(getSys('pressurization.cabinAlt', 0))} unit="FT" max={12000} />
              <Gauge label="DIFF" value={getSys('pressurization.diffPressure', 0)} unit="PSI" max={9} />
          </div>
          <div className="b737-process-status b737-annunciator-strip b737-press-status-row">
              <Annunciator label="AUTO FAIL" active={false} color="amber" />
              <Annunciator label="MANUAL" active={false} color="amber" />
          </div>
          <div className="b737-knob-bank b737-press-controls b737-press-bottom-row">
              <RotarySelector label="MODE" active={true} onClick={() => {}} subLabel="AUTO" />
              <AnalogFace label="RATE" value={getSys('pressurization.cabinAlt', 0) / 100} unit="" max={50} />
              <GuardedSwitch label="OXY" active={false} onClick={() => {}} subLabel="TEST" annunciator={{ label: 'ON', active: false, color: 'blue' }} />
          </div>
      </div>
  );

  const B737AntiIceWorkflowModule = () => (
      <div className="b737-module b737-ice-module">
          <div className="b737-module-title">ANTI-ICE / ICE & RAIN</div>
          <div className="b737-ice-stack">
              <div className="b737-ice-row">
                  <Annunciator label="ENG 1" active={getSys('ice.engine1')} color="blue" />
                  <Switch label="ENG 1" active={getSys('ice.engine1')} onClick={() => onSystemAction('ice', 'engine1')} annunciator={{ label: 'VALVE', active: getSys('ice.engine1'), color: 'blue' }} />
              </div>
              <div className="b737-ice-row">
                  <Annunciator label="WING" active={getSys('ice.wing')} color="blue" />
                  <Switch label="WING" active={getSys('ice.wing')} onClick={() => onSystemAction('ice', 'wing')} annunciator={{ label: 'ON', active: getSys('ice.wing'), color: 'blue' }} />
              </div>
              <div className="b737-ice-row">
                  <Annunciator label="ENG 2" active={getSys('ice.engine2')} color="blue" />
                  <Switch label="ENG 2" active={getSys('ice.engine2')} onClick={() => onSystemAction('ice', 'engine2')} annunciator={{ label: 'VALVE', active: getSys('ice.engine2'), color: 'blue' }} />
              </div>
          </div>
      </div>
  );

  const B737StartWorkflowModule = () => {
      const engines = getSys('engines', {});
      const engineKeys = Object.keys(engines).filter(k => k.startsWith('eng')).sort();
      return (
          <div className="b737-module b737-start-module">
              <div className="b737-module-title">ENGINE START / IGNITION</div>
              <div className="b737-process-status b737-annunciator-strip">
                  <Annunciator label="START VALVE" active={false} color="blue" />
                  <Annunciator label="IGN" active={false} color="amber" />
              </div>
              <div className="b737-start-grid">
                  {engineKeys.map((key, i) => (
                      <RotarySelector key={key} label={`ENG ${i + 1} START`} active={engines[key].startSwitch !== 'OFF'} onClick={() => onSystemAction('engines', `${key}_start_toggle`)} subLabel={engines[key].startSwitch || 'OFF'} />
                  ))}
                  {engineKeys.map((key, i) => (
                      <Switch key={`${key}-fuel`} label={`ENG ${i + 1} FUEL`} active={engines[key].fuelControl} onClick={() => onSystemAction('engines', `${key}_fuel`)} subLabel="CUTOFF" annunciator={{ label: 'RUN', active: engines[key].fuelControl, color: 'green' }} enabled={hasEngineStartAir} />
                  ))}
              </div>
          </div>
      );
  };

  const B737LightingWorkflowModule = () => (
      <div className="b737-module b737-lighting-module">
          <div className="b737-bottom-groups">
              {renderB737ChildElement('footerLighting', 'lightingLeft', (
                  <div className="b737-bottom-group">
                      <div className="b737-local-label">LEFT LIGHTS</div>
                      {renderB737ControlElement('lightingLeft', 'light-nav', (
                          <Switch label="NAV" active={getSys('lighting.navLights')} onClick={() => onSystemAction('lighting', 'navLights')} subLabel="ON" />
                      ))}
                      {renderB737ControlElement('lightingLeft', 'light-beacon', (
                          <Switch label="BEACON" active={getSys('lighting.beaconLights')} onClick={() => onSystemAction('lighting', 'beaconLights')} subLabel="ON" />
                      ))}
                      {renderB737ControlElement('lightingLeft', 'light-dim', (
                          <MiniPush label="DIM" />
                      ))}
                  </div>
              ))}
              {renderB737ChildElement('footerLighting', 'lightingCenter', (
                  <div className="b737-bottom-group">
                      <div className="b737-local-label">CENTER UTIL</div>
                      {renderB737ControlElement('lightingCenter', 'light-strobe', (
                          <Switch label="STROBE" active={getSys('lighting.strobeLights')} onClick={() => onSystemAction('lighting', 'strobeLights')} subLabel="ON" />
                      ))}
                      {renderB737ControlElement('lightingCenter', 'light-landl', (
                          <Switch label="LAND L" active={getSys('lighting.landingLights')} onClick={() => onSystemAction('lighting', 'landingLights')} subLabel="ON" />
                      ))}
                      {renderB737ControlElement('lightingCenter', 'light-landr', (
                          <Switch label="LAND R" active={getSys('lighting.landingLights')} onClick={() => onSystemAction('lighting', 'landingLights')} subLabel="ON" />
                      ))}
                  </div>
              ))}
              {renderB737ChildElement('footerLighting', 'lightingRight', (
                  <div className="b737-bottom-group">
                      <div className="b737-local-label">RIGHT LOWER</div>
                      {renderB737ControlElement('lightingRight', 'light-taxi', (
                          <Switch label="TAXI" active={getSys('lighting.taxiLights')} onClick={() => onSystemAction('lighting', 'taxiLights')} subLabel="ON" />
                      ))}
                      {renderB737ControlElement('lightingRight', 'light-emer', (
                          <Switch label="EMER LTS" active={getSys('lighting.emergencyLights', true)} onClick={() => onSystemAction('lighting', 'emergencyLights')} subLabel="ARM" annunciator={{ label: 'OFF', active: !getSys('lighting.emergencyLights', true), color: 'amber' }} />
                      ))}
                      {renderB737ControlElement('lightingRight', 'light-test', (
                          <MiniPush label="TEST" />
                      ))}
                  </div>
              ))}
          </div>
      </div>
  );

  const B737UpperFlightControlPlate = () => (
      <div className="b737-upper-plate b737-upper-left">
          <div className="b737-local-label">FLT CONTROL</div>
          <div className="b737-upper-dense-row b737-upper-dense-row-flight">
              <Switch label="YAW" active={getSys('flightControls.yawDamper', true)} onClick={() => onSystemAction('flightControls', 'yawDamper')}
                  annunciator={{ label: 'DAMPER', active: !getSys('flightControls.yawDamper', true), color: 'amber' }} />
              <div className="b737-top-annunciator-stack">
                  <Annunciator label="LOW QTY" active={false} color="amber" />
                  <Annunciator label="FEEL DIFF" active={false} color="amber" />
                  <Annunciator label="AUTO SLAT" active={false} color="amber" />
                  <Annunciator label="FLT" active={false} color="blue" />
              </div>
              <RotarySelector label="FLT" active={false} onClick={() => {}} subLabel="TEST" />
          </div>
      </div>
  );

  const B737UpperNavPlate = () => (
      <div className="b737-upper-plate b737-upper-nav">
          <div className="b737-local-label">NAV</div>
          <div className="b737-upper-dense-row b737-nav-row">
              <RotarySelector label="IRS" active={false} onClick={() => {}} subLabel="NAV" />
              <RotarySelector label="DSPLY" active={false} onClick={() => {}} subLabel="AUTO" />
          </div>
          <div className="b737-process-status b737-top-status-tight">
              <Annunciator label="ALIGN" active={false} color="amber" />
              <Annunciator label="DC FAIL" active={false} color="amber" />
          </div>
      </div>
  );

  const B737UpperCallPlate = () => (
      <div className="b737-slot-plate">
          <div className="b737-local-label">CALL</div>
          <Annunciator label="ATTEND" active={false} color="blue" />
          <MiniPush label="PUSH" />
      </div>
  );

  const B737UpperUtilityPlate = () => (
      <div className="b737-upper-plate b737-upper-ops">
          <div className="b737-local-label">UTILITY</div>
          <div className="b737-upper-dense-row b737-utility-row">
              <Switch label="SEAT" active={getSys('signs.seatBelts')} onClick={() => onSystemAction('signs', 'seatBelts')} subLabel="BELTS" invertLight={true} />
              <Switch label="NO" active={getSys('signs.noSmoking')} onClick={() => onSystemAction('signs', 'noSmoking')} subLabel="SMOKE" invertLight={true} />
              <Annunciator label="AUTO" active={false} color="blue" />
              <MiniPush label="SERV" />
              <MiniPush label="RST" />
              <Annunciator label="CABIN" active={false} color="amber" />
          </div>
      </div>
  );

  const B737UpperTestPlate = () => (
      <div className="b737-upper-plate b737-upper-test">
          <div className="b737-local-label">CVR / TEST</div>
          <div className="b737-upper-test-grid">
              <Annunciator label="TEST" active={false} color="amber" />
              <Annunciator label="ERASE" active={false} color="amber" />
              <MiniPush label="CVR" />
              <MiniPush label="TEST" />
              <MiniPush label="CHK" />
              <MiniPush label="MAINT" />
          </div>
      </div>
  );

  const B737CenterSpinePlate = () => (
      <div className="b737-center-spine">
          <div className="b737-spine-stack">
              <div className="b737-spine-segment">
                  <div className="b737-local-label">ALERT</div>
                  <Annunciator label="MASTER" active={false} color="amber" />
                  <Annunciator label="ALIGN" active={false} color="amber" />
              </div>
              <div className="b737-spine-segment">
                  <div className="b737-local-label">REC</div>
                  <RotarySelector label="REC" active={false} onClick={() => {}} subLabel="AUTO" />
              </div>
              <div className="b737-spine-segment">
                  <div className="b737-local-label">MTR</div>
                  <RotarySelector label="MTR" active={true} onClick={() => {}} subLabel="AUTO" />
              </div>
          </div>
      </div>
  );

  const B737MonitorPlate = () => (
      <div className="b737-special-monitor-plate">
          <div className="b737-local-label">MONITOR</div>
          <div className="b737-gauge-row b737-monitor-row">
              <AnalogFace label="CAB" value={Math.round(getSys('pressurization.cabinAlt', 0) / 120)} unit="" max={100} />
              <AnalogFace label="DUCT" value={Math.round(getSys('pressurization.ductPressR', 0))} unit="" max={60} />
              <AnalogFace label="OXY" value={92} unit="%" max={100} />
          </div>
          <div className="b737-process-status b737-annunciator-strip b737-monitor-status">
              <Annunciator label="WARN" active={false} color="amber" />
              <Annunciator label="LOW" active={false} color="amber" />
          </div>
      </div>
  );

  const B737FooterUtilityPlate = () => (
      <div className="b737-footer-utility b737-footer-utility-plate">
          <div className="b737-local-label">LOWER UTIL</div>
          <GuardedSwitch label="APU" active={getSys('apu.master')} onClick={() => onSystemAction('apu', 'master')} subLabel="MASTER" annunciator={{ label: 'ON', active: getSys('apu.master'), color: 'blue' }} />
          <MiniPush label="CHK" />
          <MiniPush label="TEST" />
          <Annunciator label="STBY" active={false} color="amber" />
      </div>
  );

  const builderStyleClass = `b737-builder-style-${builderStyle}`;
  const getBuilderBindingValue = (binding, fallback = false) => {
      if (!binding?.path) {
          return fallback;
      }
      const rawValue = getSys(binding.path, binding.defaultValue ?? fallback);
      if (binding.transform === 'boolean') {
          return Boolean(rawValue);
      }
      if (binding.transform === 'number' || binding.transform === 'percentage') {
          const parsed = Number(rawValue);
          return Number.isFinite(parsed) ? parsed : Number(binding.defaultValue ?? fallback) || 0;
      }
      return rawValue;
  };
  const evaluateBuilderCondition = (condition) => {
      if (!condition) {
          return false;
      }
      if (typeof condition === 'string') {
          return Boolean(getSys(condition, false));
      }
      if (condition.truthy) {
          return Boolean(getSys(condition.truthy, false));
      }
      if (condition.falsy) {
          return !getSys(condition.falsy, false);
      }
      if (condition.eq) {
          return getSys(condition.eq.path, undefined) === condition.eq.value;
      }
      if (condition.neq) {
          return getSys(condition.neq.path, undefined) !== condition.neq.value;
      }
      if (condition.gt) {
          return Number(getSys(condition.gt.path, 0)) > Number(condition.gt.value);
      }
      if (condition.gte) {
          return Number(getSys(condition.gte.path, 0)) >= Number(condition.gte.value);
      }
      if (condition.lt) {
          return Number(getSys(condition.lt.path, 0)) < Number(condition.lt.value);
      }
      if (condition.lte) {
          return Number(getSys(condition.lte.path, 0)) <= Number(condition.lte.value);
      }
      if (condition.between) {
          const value = Number(getSys(condition.between.path, 0));
          return value >= Number(condition.between.min) && value <= Number(condition.between.max);
      }
      if (Array.isArray(condition.all)) {
          return condition.all.every((entry) => evaluateBuilderCondition(entry));
      }
      if (Array.isArray(condition.any)) {
          return condition.any.some((entry) => evaluateBuilderCondition(entry));
      }
      if (condition.not) {
          return !evaluateBuilderCondition(condition.not);
      }
      return false;
  };
  const triggerBuilderBinding = (binding) => {
      if (!binding?.system || !binding?.action) {
          return;
      }
      onSystemAction(binding.system, binding.action, binding.value);
  };
  const builderPresentIds = (b737EditorLayout?.elements || []).filter((element) => element.visible !== false).map((element) => element.id);
  const builderVisibleElements = (b737EditorLayout?.elements || []).filter((element) => element.visible !== false);
  const builderPresentKinds = [...new Set(builderVisibleElements.map((element) => element.kind || 'module'))];
  const builderCatalogItems = [...b737BuilderCatalog, ...builderTypeCatalog];
  const builderTypeTargets = ['module', 'plate', 'slot', 'spine', 'footer', 'panelShell', 'moduleShell', 'switch', 'guardedSwitch', 'pushButton', 'annunciator', 'rotary', 'radialGauge', 'valueIndicator', 'label', 'pipeSegment', 'junctionNode', 'placeholder'];
  const builderMissingKinds = builderTypeTargets.filter((kind) => !builderPresentKinds.includes(kind));
  const builderMissingRequired = b737RequiredBuilderIds.filter((id) => !builderPresentIds.includes(id));
  const builderCoverage = Math.round((builderPresentKinds.length / builderTypeTargets.length) * 100);
  const builderSectionMap = Object.fromEntries(builderCatalogItems.map((item) => [item.id, item]));
  const builderValidation = {
      blocking: [
          ...new Set((b737EditorLayout?.elements || []).filter((element, index, array) => array.findIndex((candidate) => candidate.id === element.id) !== index).map((element) => `Duplicate element ID: ${element.id}`)),
          ...(b737EditorLayout?.elements || []).filter((element) => !builderTypeTargets.includes(element.kind || 'module')).map((element) => `Unsupported type for ${element.id}: ${element.kind || 'unknown'}`),
          ...(b737EditorLayout?.elements || []).filter((element) => element.builderGenerated && ['switch', 'guardedSwitch', 'rotary', 'pushButton'].includes(element.kind) && (!element.writeBinding?.system || !element.writeBinding?.action)).map((element) => `Missing write binding for ${element.id}`),
          ...(b737EditorLayout?.elements || []).filter((element) => element.kind === 'radialGauge' && Number(element.props?.max) <= Number(element.props?.min)).map((element) => `Invalid gauge range for ${element.id}`),
          ...(b737EditorLayout?.elements || []).filter((element) => element.kind === 'pipeSegment' && element.props?.from && element.props?.to && element.props.from.x !== element.props.to.x && element.props.from.y !== element.props.to.y).map((element) => `Non-orthogonal pipe segment: ${element.id}`)
      ],
      warnings: [
          ...builderMissingRequired.map((id) => `Missing baseline item: ${builderSectionMap[id]?.label || id}`),
          ...builderMissingKinds.map((kind) => `Missing type coverage: ${kind}`),
          ...(b737EditorLayout?.elements || []).filter((element) => element.builderGenerated && ['switch', 'guardedSwitch', 'annunciator', 'rotary', 'radialGauge', 'valueIndicator'].includes(element.kind) && !element.readBinding?.path).map((element) => `Missing read path for ${element.id}`),
          ...(b737EditorLayout?.elements || []).filter((element) => element.builderGenerated && !element.purpose?.role && !element.purpose?.notes).map((element) => `Purpose not set for ${element.id}`),
          ...(b737EditorLayout?.elements || []).filter((element) => element.kind === 'pipeSegment' && (!element.conditions?.activeWhen && !element.conditions?.faultWhen)).map((element) => `Pipe has no conditions: ${element.id}`)
      ]
  };

  const addBuilderElement = (elementId) => {
      const existing = b737ElementMap[elementId];
      if (existing) {
          toggleB737ElementFlag(elementId, 'visible');
          setSelectedEditorTarget({ type: 'element', id: elementId });
          return;
      }
      const catalogItem = builderSectionMap[elementId];
      if (!catalogItem) return;
      if (catalogItem.addMode === 'create') {
          const newElement = buildGenericBuilderElement(catalogItem, (b737EditorLayout?.elements || []).length);
          setB737EditorLayout((currentLayout) => ({
              ...currentLayout,
              elements: [...currentLayout.elements, newElement]
          }));
          setSelectedEditorTarget({ type: 'element', id: newElement.id });
          return;
      }
      const source = b737OverheadEditableLayout.elements.find((element) => element.id === elementId);
      if (!source) return;
      setB737EditorLayout((currentLayout) => ({
          ...currentLayout,
          elements: [...currentLayout.elements, { ...source, visible: true, locked: false }]
      }));
      setSelectedEditorTarget({ type: 'element', id: elementId });
    };

  const removeBuilderElement = (elementId) => {
      const target = b737ElementMap[elementId];
      if (!target) {
          return;
      }
      if (!fixedBuilderElementIds.has(elementId) && target.builderGenerated) {
          updateB737EditorElements((elements) => elements.filter((element) => element.id !== elementId));
      } else {
          updateB737EditorElements((elements) => elements.map((element) => element.id === elementId ? {
              ...element,
              visible: false
          } : element));
      }
      if (selectedEditorTarget?.type === 'element' && selectedEditorTarget.id === elementId) {
          setSelectedEditorTarget(null);
      }
  };

  const resetBuilderFromScratch = () => {
      setB737EditorLayout((currentLayout) => ({
          ...currentLayout,
          elements: currentLayout.elements.filter((element) => !element.builderGenerated).map((element) => ({ ...element, visible: false, locked: false }))
      }));
      setSelectedEditorTarget(null);
      setAlignmentGuides([]);
  };

  const B737ScratchBuilderPanel = ({ docked = false }) => (
      <div className={`b737-layout-editor-panel b737-builder-panel${docked ? ' b737-layout-editor-panel-docked' : ''}`} style={docked ? undefined : { transform: `translate(${builderPanelPosition.x}px, ${builderPanelPosition.y}px)` }}>
          <div className={`b737-layout-editor-header${docked ? '' : ' b737-floating-panel-handle'}`} onMouseDown={docked ? undefined : ((event) => startFloatingPanelDrag('builder', event))}>
              <span>OH-PNL Builder</span>
              <span className="b737-layout-editor-hint">All item types</span>
          </div>
          <div className="b737-layout-editor-actions">
              <button type="button" onClick={resetBuilderFromScratch}>Blank</button>
              <button type="button" onClick={resetB737EditorLayout}>Restore</button>
              <button type="button" onClick={exportB737EditorLayout} disabled={builderValidation.blocking.length > 0}>Export</button>
              <button type="button" onClick={() => editorFileInputRef.current?.click()}>Import</button>
          </div>
          <div className="b737-builder-style-row">
              <strong>Style</strong>
              <div className="b737-builder-style-pills">
                  {['classic', 'flat', 'blueprint'].map((style) => (
                      <button
                          key={style}
                          type="button"
                          className={`b737-builder-pill${builderStyle === style ? ' active' : ''}`}
                          onClick={() => setBuilderStyle(style)}
                      >
                          {style}
                      </button>
                  ))}
              </div>
          </div>
          <div className="b737-layout-editor-body b737-builder-summary">
              <div><strong>Type coverage:</strong> {builderCoverage}%</div>
              <div><strong>Visible items:</strong> {builderVisibleElements.length}</div>
              <div><strong>Kinds present:</strong> {builderPresentKinds.join(', ') || 'None'}</div>
              <div><strong>Blocking:</strong> {builderValidation.blocking.length ? builderValidation.blocking.join(' | ') : 'None'}</div>
              <div><strong>Warnings:</strong> {builderValidation.warnings.length ? builderValidation.warnings.join(' | ') : 'None'}</div>
              <div><strong>Status:</strong> {builderValidation.blocking.length ? 'Invalid' : (builderMissingRequired.length ? 'Incomplete' : 'Functionally complete')}</div>
          </div>
          <div className="b737-builder-catalog">
              {[...new Set(builderCatalogItems.map((item) => item.category))].map((category) => (
                  <div key={category} className="b737-builder-catalog-group">
                      <div className="b737-builder-catalog-title">{category}</div>
                      {builderCatalogItems.filter((item) => item.category === category).map((item) => {
                          const activeIds = item.addMode === 'create'
                              ? builderVisibleElements.filter((element) => element.builderGenerated && element.kind === item.kind).map((element) => element.id)
                              : builderPresentIds.filter((id) => id === item.id);
                          const active = activeIds.length > 0;
                          const removeId = item.addMode === 'create' ? activeIds[activeIds.length - 1] : item.id;
                          return (
                              <div key={item.id} className="b737-builder-catalog-row">
                                  <span>{item.label} <em>({item.kind})</em></span>
                                  <button type="button" onClick={() => active ? removeBuilderElement(removeId) : addBuilderElement(item.id)}>
                                      {item.addMode === 'create' ? (active ? 'Remove last' : 'Add') : (active ? 'Remove' : 'Add')}
                                  </button>
                              </div>
                          );
                      })}
                  </div>
              ))}
          </div>
      </div>
  );

  const b737ElementMap = Object.fromEntries(
      (b737EditorLayout?.elements || []).map((element) => [element.id, element])
  );
  const b737ChildElementMap = Object.fromEntries(
      ((b737EditorLayout?.childElements || [])).map((element) => [element.id, element])
  );
  const b737ControlElementMap = Object.fromEntries(
      ((b737EditorLayout?.controlElements || [])).map((element) => [element.id, element])
  );
  const selectedB737Target = selectedEditorTarget
      ? (
          selectedEditorTarget.type === 'control'
            ? b737ControlElementMap[selectedEditorTarget.id]
            : (selectedEditorTarget.type === 'child' ? b737ChildElementMap[selectedEditorTarget.id] : b737ElementMap[selectedEditorTarget.id])
        )
      : null;

  const clampRelative = (value, size = 1) => {
      const maxValue = Math.max(0, 1 - size);
      return Math.min(Math.max(value, 0), maxValue);
  };

  const clampChildRelative = (value, size = 1) => clampRelative(value, size);

  const updateB737EditorElements = (updater) => {
      setB737EditorLayout((currentLayout) => {
          const nextElements = updater(currentLayout.elements.map((element) => ({ ...element })));
          return {
              ...currentLayout,
              elements: nextElements
          };
      });
  };

  const updateB737ElementDetails = (elementId, updates) => {
      updateB737EditorElements((elements) => elements.map((element) => element.id === elementId ? {
          ...element,
          ...updates,
          readBinding: updates.readBinding !== undefined ? updates.readBinding : element.readBinding,
          writeBinding: updates.writeBinding !== undefined ? updates.writeBinding : element.writeBinding
      } : element));
  };

  const updateB737ElementBindingField = (elementId, bindingKey, field, value) => {
      const element = b737ElementMap[elementId];
      if (!element) {
          return;
      }
      updateB737ElementDetails(elementId, {
          [bindingKey]: {
              ...(element[bindingKey] || {}),
              [field]: value
          }
      });
  };

  const updateB737ElementPurposeField = (elementId, field, value) => {
      const element = b737ElementMap[elementId];
      if (!element) {
          return;
      }
      updateB737ElementDetails(elementId, {
          purpose: {
              ...(element.purpose || {}),
              [field]: value
          }
      });
  };

  const updateB737ElementConditionField = (elementId, field, value) => {
      const element = b737ElementMap[elementId];
      if (!element) {
          return;
      }
      updateB737ElementDetails(elementId, {
          conditions: {
              ...(element.conditions || {}),
              [field]: value
          }
      });
  };

  const updateB737ElementPropsField = (elementId, field, value) => {
      const element = b737ElementMap[elementId];
      if (!element) {
          return;
      }
      updateB737ElementDetails(elementId, {
          props: {
              ...(element.props || {}),
              [field]: value
          }
      });
  };

  const updateB737ControlElements = (updater) => {
      setB737EditorLayout((currentLayout) => {
          const nextControlElements = updater((currentLayout.controlElements || []).map((element) => ({ ...element })));
          return {
              ...currentLayout,
              controlElements: nextControlElements
          };
      });
  };

  const getConditionPreview = (condition) => {
      if (!condition) {
          return '—';
      }
      if (typeof condition === 'string') {
          return condition;
      }
      try {
          return JSON.stringify(condition);
      } catch {
          return '[invalid condition]';
      }
  };

  const parseConditionInput = (value) => {
      const trimmed = String(value || '').trim();
      if (!trimmed) {
          return null;
      }
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
          return trimmed;
      }
      try {
          return JSON.parse(trimmed);
      } catch {
          return trimmed;
      }
  };

  const renderBuilderRadialGauge = (element, value) => {
      const min = Number(element.props?.min ?? 0);
      const max = Number(element.props?.max ?? 100);
      const safeValue = Number.isFinite(Number(value)) ? Number(value) : min;
      const ratio = max > min ? Math.max(0, Math.min(1, (safeValue - min) / (max - min))) : 0;
      const angle = Number(element.props?.sweepStart ?? -120) + ratio * (Number(element.props?.sweepEnd ?? 120) - Number(element.props?.sweepStart ?? -120));
      return (
          <div className="b737-builder-radial-gauge">
              <svg viewBox="0 0 100 100" className="b737-builder-radial-svg">
                  <circle cx="50" cy="50" r="34" className="b737-builder-radial-ring" />
                  {(element.props?.zones || []).map((zone, index) => {
                      const zoneStart = max > min ? (Number(zone.min) - min) / (max - min) : 0;
                      const zoneEnd = max > min ? (Number(zone.max) - min) / (max - min) : 0;
                      const startAngle = (Number(element.props?.sweepStart ?? -120) + zoneStart * (Number(element.props?.sweepEnd ?? 120) - Number(element.props?.sweepStart ?? -120))) * Math.PI / 180;
                      const endAngle = (Number(element.props?.sweepStart ?? -120) + zoneEnd * (Number(element.props?.sweepEnd ?? 120) - Number(element.props?.sweepStart ?? -120))) * Math.PI / 180;
                      const x1 = 50 + Math.cos(startAngle) * 34;
                      const y1 = 50 + Math.sin(startAngle) * 34;
                      const x2 = 50 + Math.cos(endAngle) * 34;
                      const y2 = 50 + Math.sin(endAngle) * 34;
                      return <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke={zone.color || '#ffaa00'} strokeWidth="4" strokeLinecap="round" />;
                  })}
                  <line x1="50" y1="50" x2={50 + Math.cos(angle * Math.PI / 180) * 26} y2={50 + Math.sin(angle * Math.PI / 180) * 26} className="b737-builder-radial-needle" />
                  <circle cx="50" cy="50" r="4" className="b737-builder-radial-hub" />
              </svg>
              <div className="b737-builder-radial-readout">{safeValue.toFixed(0)}{element.props?.unit || ''}</div>
          </div>
      );
  };

  const renderGenericBuilderElement = (element) => {
      const label = element.builderLabel || element.id;
      const purposeLabel = element.purpose?.role || element.purpose?.notes || label;
      const commonClass = `b737-builder-generic b737-builder-generic-${element.kind || 'module'}`;
      const readValue = getBuilderBindingValue(element.readBinding, false);
      const bindingSubLabel = purposeLabel ? purposeLabel.slice(0, 10).toUpperCase() : 'GEN';
      const isVisibleByCondition = !element.conditions?.visibleWhen || evaluateBuilderCondition(element.conditions.visibleWhen);
      if (!isVisibleByCondition) {
          return null;
      }
      if ((element.kind || 'module') === 'switch') {
          return <div className={commonClass}><Switch label={label} active={Boolean(readValue)} onClick={() => triggerBuilderBinding(element.writeBinding)} subLabel={bindingSubLabel} /></div>;
      }
      if (element.kind === 'guardedSwitch') {
          return <div className={commonClass}><GuardedSwitch label={label} active={Boolean(readValue)} onClick={() => triggerBuilderBinding(element.writeBinding)} subLabel={bindingSubLabel} /></div>;
      }
      if (element.kind === 'pushButton') {
          return <div className={commonClass}><MiniPush label={label} onClick={() => triggerBuilderBinding(element.writeBinding)} /></div>;
      }
      if (element.kind === 'annunciator') {
          const active = element.conditions?.activeWhen ? evaluateBuilderCondition(element.conditions.activeWhen) : Boolean(readValue);
          const fault = element.conditions?.faultWhen ? evaluateBuilderCondition(element.conditions.faultWhen) : false;
          return <div className={commonClass}><div className="b737-local-label">{purposeLabel}</div><Annunciator label={label.toUpperCase().slice(0, 10)} active={active} color={fault ? 'red' : 'amber'} /></div>;
      }
      if (element.kind === 'rotary') {
          return <div className={commonClass}><RotarySelector label={label} active={Boolean(readValue)} onClick={() => triggerBuilderBinding(element.writeBinding)} subLabel={bindingSubLabel} /></div>;
      }
      if (element.kind === 'radialGauge') {
          return <div className={commonClass}><div className="b737-local-label">{purposeLabel}</div>{renderBuilderRadialGauge(element, readValue)}</div>;
      }
      if (element.kind === 'valueIndicator') {
          return <div className={`${commonClass} b737-builder-shell`}><div className="b737-local-label">{label}</div><span>{Number(readValue) || readValue || 0}{element.props?.unit || ''}</span></div>;
      }
      if (element.kind === 'label') {
          return <div className={`${commonClass} b737-builder-label`}><span>{purposeLabel}</span></div>;
      }
      if (element.kind === 'pipeSegment') {
          const active = element.conditions?.activeWhen ? evaluateBuilderCondition(element.conditions.activeWhen) : false;
          const fault = element.conditions?.faultWhen ? evaluateBuilderCondition(element.conditions.faultWhen) : false;
          const stroke = fault ? (element.props?.faultColor || '#ff8c42') : (active ? (element.props?.activeColor || '#42d7ff') : (element.props?.inactiveColor || '#3f4a51'));
          const from = element.props?.from || { x: element.x, y: element.y + element.height / 2 };
          const to = element.props?.to || { x: element.x + element.width, y: element.y + element.height / 2 };
          return <svg className={`${commonClass} b737-builder-pipe`} viewBox="0 0 100 100" preserveAspectRatio="none"><line x1={from.x * 100} y1={from.y * 100} x2={to.x * 100} y2={to.y * 100} stroke={stroke} strokeWidth={Math.max(1, Number(element.props?.lineWidth || 3))} strokeLinecap="round" /></svg>;
      }
      if (element.kind === 'junctionNode') {
          return <div className={`${commonClass} b737-builder-node`} />;
      }
      if (element.kind === 'panelShell' || element.kind === 'moduleShell') {
          return <div className={`${commonClass} b737-builder-shell`}><div className="b737-local-label">{label}</div><span>{purposeLabel}</span></div>;
      }
      if (element.kind === 'placeholder') {
          return <div className={`${commonClass} b737-builder-placeholder`}><span>{purposeLabel}</span></div>;
      }
      if (element.kind === 'footer') {
          return <div className={`${commonClass} b737-builder-shell`}><div className="b737-local-label">{label}</div><span>{purposeLabel || 'Footer strip'}</span></div>;
      }
      if (element.kind === 'spine') {
          return <div className={`${commonClass} b737-builder-shell`}><div className="b737-local-label">{label}</div><span>{purposeLabel || 'Spine group'}</span></div>;
      }
      if (element.kind === 'slot') {
          return <div className={`${commonClass} b737-builder-shell`}><div className="b737-local-label">{label}</div><MiniPush label={bindingSubLabel || 'PUSH'} onClick={() => triggerBuilderBinding(element.writeBinding)} /></div>;
      }
      return <div className={`${commonClass} b737-builder-shell`}><div className="b737-local-label">{label}</div><span>{purposeLabel || (element.kind || 'module').toUpperCase()}</span></div>;
  };

  const detectAlignmentGuides = (activeElementId, nextX, nextY, width, height) => {
      const tolerance = 0.008;
      const guides = [];
      const centerX = nextX + width / 2;
      const centerY = nextY + height / 2;
      const otherElements = (b737EditorLayout?.elements || []).filter((element) => element.id !== activeElementId && element.visible !== false);

      otherElements.forEach((element) => {
          const otherCenterX = element.x + element.width / 2;
          const otherCenterY = element.y + element.height / 2;
          if (Math.abs(otherCenterX - centerX) <= tolerance) {
              guides.push({ axis: 'x', value: otherCenterX, kind: 'element-center' });
          }
          if (Math.abs(otherCenterY - centerY) <= tolerance) {
              guides.push({ axis: 'y', value: otherCenterY, kind: 'element-center' });
          }
      });

      (b737EditorLayout?.guides?.vertical || []).forEach((value) => {
          if (Math.abs(value - centerX) <= tolerance) {
              guides.push({ axis: 'x', value, kind: 'canvas-guide' });
          }
      });
      (b737EditorLayout?.guides?.horizontal || []).forEach((value) => {
          if (Math.abs(value - centerY) <= tolerance) {
              guides.push({ axis: 'y', value, kind: 'canvas-guide' });
          }
      });

      return guides;
  };

  const detectChildAlignmentGuides = (activeChildId, parentId, nextX, nextY, width, height) => {
      const tolerance = 0.02;
      const guides = [];
      const centerX = nextX + width / 2;
      const centerY = nextY + height / 2;
      const siblings = (b737EditorLayout?.childElements || []).filter((element) => element.parentId === parentId && element.id !== activeChildId && element.visible !== false);

      siblings.forEach((element) => {
          const siblingCenterX = element.x + element.width / 2;
          const siblingCenterY = element.y + element.height / 2;
          if (Math.abs(siblingCenterX - centerX) <= tolerance) {
              guides.push({ axis: 'x', value: siblingCenterX, kind: 'child-center', parentId });
          }
          if (Math.abs(siblingCenterY - centerY) <= tolerance) {
              guides.push({ axis: 'y', value: siblingCenterY, kind: 'child-center', parentId });
          }
      });

      return guides;
  };

  const detectControlAlignmentGuides = (activeControlId, parentId, nextX, nextY, width, height) => {
      const tolerance = 0.03;
      const guides = [];
      const centerX = nextX + width / 2;
      const centerY = nextY + height / 2;
      const siblings = (b737EditorLayout?.controlElements || []).filter((element) => element.parentId === parentId && element.id !== activeControlId && element.visible !== false);

      siblings.forEach((element) => {
          const siblingCenterX = element.x + element.width / 2;
          const siblingCenterY = element.y + element.height / 2;
          if (Math.abs(siblingCenterX - centerX) <= tolerance) {
              guides.push({ axis: 'x', value: siblingCenterX, kind: 'control-center', parentId });
          }
          if (Math.abs(siblingCenterY - centerY) <= tolerance) {
              guides.push({ axis: 'y', value: siblingCenterY, kind: 'control-center', parentId });
          }
      });

      return guides;
  };

  const moveB737Element = (elementId, deltaX, deltaY, options = {}) => {
      const sourceElement = b737ElementMap[elementId];
      if (!sourceElement || sourceElement.locked) {
          return;
      }

      const idsToMove = options.groupMove && sourceElement.groupId
          ? (b737EditorLayout?.elements || []).filter((element) => element.groupId === sourceElement.groupId && !element.locked).map((element) => element.id)
          : [elementId];

      let nextGuides = [];
      updateB737EditorElements((elements) => elements.map((element) => {
          if (!idsToMove.includes(element.id)) {
              return element;
          }
          const nextX = clampRelative(element.x + deltaX, element.width);
          const nextY = clampRelative(element.y + deltaY, element.height);
          if (element.id === elementId) {
              nextGuides = detectAlignmentGuides(element.id, nextX, nextY, element.width, element.height);
          }
          return {
              ...element,
              x: nextX,
              y: nextY
          };
      }));
      setAlignmentGuides(nextGuides);
  };

  const moveB737ChildElement = (childId, deltaX, deltaY) => {
      const sourceChild = b737ChildElementMap[childId];
      if (!sourceChild || sourceChild.locked) {
          return;
      }

      let nextGuides = [];
      updateB737ChildElements((elements) => elements.map((element) => {
          if (element.id !== childId) {
              return element;
          }
          const nextX = clampChildRelative(element.x + deltaX, element.width);
          const nextY = clampChildRelative(element.y + deltaY, element.height);
          nextGuides = detectChildAlignmentGuides(element.id, element.parentId, nextX, nextY, element.width, element.height);
          return {
              ...element,
              x: nextX,
              y: nextY
          };
      }));
      setAlignmentGuides(nextGuides);
  };

  const resizeB737ChildElement = (childId, deltaX, deltaY) => {
      const sourceChild = b737ChildElementMap[childId];
      if (!sourceChild || sourceChild.locked) {
          return;
      }
      updateB737ChildElements((elements) => elements.map((element) => {
          if (element.id !== childId) {
              return element;
          }
          const nextWidth = Math.min(1 - element.x, Math.max(0.06, element.width + deltaX));
          const nextHeight = Math.min(1 - element.y, Math.max(0.06, element.height + deltaY));
          return {
              ...element,
              width: nextWidth,
              height: nextHeight
          };
      }));
  };

  const moveB737ControlElement = (controlId, deltaX, deltaY) => {
      const sourceControl = b737ControlElementMap[controlId];
      if (!sourceControl || sourceControl.locked) {
          return;
      }

      let nextGuides = [];
      updateB737ControlElements((elements) => elements.map((element) => {
          if (element.id !== controlId) {
              return element;
          }
          const nextX = clampChildRelative(element.x + deltaX, element.width);
          const nextY = clampChildRelative(element.y + deltaY, element.height);
          nextGuides = detectControlAlignmentGuides(element.id, element.parentId, nextX, nextY, element.width, element.height);
          return {
              ...element,
              x: nextX,
              y: nextY
          };
      }));
      setAlignmentGuides(nextGuides);
  };

  const resizeB737ControlElement = (controlId, deltaX, deltaY) => {
      const sourceControl = b737ControlElementMap[controlId];
      if (!sourceControl || sourceControl.locked) {
          return;
      }
      updateB737ControlElements((elements) => elements.map((element) => {
          if (element.id !== controlId) {
              return element;
          }
          const nextWidth = Math.min(1 - element.x, Math.max(0.08, element.width + deltaX));
          const nextHeight = Math.min(1 - element.y, Math.max(0.08, element.height + deltaY));
          return {
              ...element,
              width: nextWidth,
              height: nextHeight
          };
      }));
  };

  const toggleB737ElementFlag = (elementId, key) => {
      updateB737EditorElements((elements) => elements.map((element) => element.id === elementId ? {
          ...element,
          [key]: !element[key]
      } : element));
  };

  const toggleB737ChildElementFlag = (childId, key) => {
      updateB737ChildElements((elements) => elements.map((element) => element.id === childId ? {
          ...element,
          [key]: !element[key]
      } : element));
  };

  const toggleB737ControlElementFlag = (controlId, key) => {
      updateB737ControlElements((elements) => elements.map((element) => element.id === controlId ? {
          ...element,
          [key]: !element[key]
      } : element));
  };

  const resetB737EditorLayout = () => {
      setB737EditorLayout(JSON.parse(JSON.stringify(b737OverheadEditableLayout)));
      setSelectedEditorTarget(null);
      setAlignmentGuides([]);
  };

  const exportB737EditorLayout = () => {
      const blob = new Blob([JSON.stringify(b737EditorLayout, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'b737-overhead-layout.json';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
  };

  const importB737EditorLayout = (event) => {
      const file = event.target.files?.[0];
      if (!file) {
          return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
          try {
              const parsed = JSON.parse(String(loadEvent.target?.result || '{}'));
              if (!parsed || !Array.isArray(parsed.elements)) {
                  throw new Error('Invalid 737 layout file');
              }
              setB737EditorLayout({
                  ...b737OverheadEditableLayout,
                  ...parsed,
                  elements: parsed.elements.map((element) => ({ ...element, kind: element.kind || 'module' })),
                  childElements: Array.isArray(parsed.childElements)
                      ? parsed.childElements.map((element) => ({ ...element }))
                      : (b737OverheadEditableLayout.childElements || []).map((element) => ({ ...element })),
                  controlElements: Array.isArray(parsed.controlElements)
                      ? parsed.controlElements.map((element) => ({ ...element }))
                      : (b737OverheadEditableLayout.controlElements || []).map((element) => ({ ...element }))
              });
              setAlignmentGuides([]);
            } catch (error) {
              console.error('Failed to import 737 layout JSON:', error);
            }
      };
      reader.readAsText(file);
      event.target.value = '';
  };

  const renderB737ChildElement = (parentId, childId, content) => {
      const child = b737ChildElementMap[childId];
      if (!child || child.parentId !== parentId || child.visible === false) {
          return content;
      }

      const isSelected = selectedEditorTarget?.type === 'child' && selectedEditorTarget.id === childId;
      return (
          <div
              className={`b737-module-child-editor${isSelected ? ' selected' : ''}${layoutDebug ? ' debug-active' : ''}`}
              data-b737-child-id={childId}
              style={{
                  left: `${child.x * 100}%`,
                  top: `${child.y * 100}%`,
                  width: `${child.width * 100}%`,
                  height: `${child.height * 100}%`,
                  zIndex: child.zIndex ?? 2
              }}
              onMouseDown={(event) => {
                  if (!layoutDebug || child.locked) {
                      return;
                  }
                  event.stopPropagation();
                  setSelectedEditorTarget({ type: 'child', id: childId });
                  editorDragStateRef.current = {
                      targetType: 'child',
                      mode: 'move',
                      id: childId,
                      startX: event.clientX,
                      startY: event.clientY,
                      originalX: child.x,
                      originalY: child.y,
                      width: child.width,
                      height: child.height,
                      parentId
                  };
                  document.body.style.cursor = 'grabbing';
                  event.preventDefault();
              }}
              onClick={(event) => {
                  if (!layoutDebug) {
                      return;
                  }
                  event.stopPropagation();
                  setSelectedEditorTarget({ type: 'child', id: childId });
              }}
          >
              {content}
              {layoutDebug && isSelected && !child.locked && (
                  <div
                      className="b737-editor-resize-handle"
                      onMouseDown={(event) => {
                          event.stopPropagation();
                          setSelectedEditorTarget({ type: 'child', id: childId });
                          editorDragStateRef.current = {
                              targetType: 'child',
                              mode: 'resize',
                              id: childId,
                              startX: event.clientX,
                              startY: event.clientY,
                              width: child.width,
                              height: child.height,
                              parentId
                          };
                          document.body.style.cursor = 'nwse-resize';
                          event.preventDefault();
                      }}
                  />
              )}
          </div>
      );
  };

  const renderB737ControlElement = (parentId, controlId, content) => {
      const control = b737ControlElementMap[controlId];
      if (!control || control.parentId !== parentId || control.visible === false) {
          return content;
      }

      const isSelected = selectedEditorTarget?.type === 'control' && selectedEditorTarget.id === controlId;
      return (
          <div
              className={`b737-module-control-editor${isSelected ? ' selected' : ''}${layoutDebug ? ' debug-active' : ''}`}
              data-b737-control-id={controlId}
              style={{
                  left: `${control.x * 100}%`,
                  top: `${control.y * 100}%`,
                  width: `${control.width * 100}%`,
                  height: `${control.height * 100}%`,
                  zIndex: control.zIndex ?? 4
              }}
              onMouseDown={(event) => {
                  if (!layoutDebug || control.locked) {
                      return;
                  }
                  event.stopPropagation();
                  setSelectedEditorTarget({ type: 'control', id: controlId });
                  editorDragStateRef.current = {
                      targetType: 'control',
                      mode: 'move',
                      id: controlId,
                      startX: event.clientX,
                      startY: event.clientY,
                      originalX: control.x,
                      originalY: control.y,
                      width: control.width,
                      height: control.height,
                      parentId
                  };
                  document.body.style.cursor = 'grabbing';
                  event.preventDefault();
              }}
              onClick={(event) => {
                  if (!layoutDebug) {
                      return;
                  }
                  event.stopPropagation();
                  setSelectedEditorTarget({ type: 'control', id: controlId });
              }}
          >
              {content}
              {layoutDebug && isSelected && !control.locked && (
                  <div
                      className="b737-editor-resize-handle control-handle"
                      onMouseDown={(event) => {
                          event.stopPropagation();
                          setSelectedEditorTarget({ type: 'control', id: controlId });
                          editorDragStateRef.current = {
                              targetType: 'control',
                              mode: 'resize',
                              id: controlId,
                              startX: event.clientX,
                              startY: event.clientY,
                              width: control.width,
                              height: control.height,
                              parentId
                          };
                          document.body.style.cursor = 'nwse-resize';
                          event.preventDefault();
                      }}
                  />
              )}
          </div>
      );
  };

  const renderB737EditableElement = (elementId, className, content) => {
      const element = b737ElementMap[elementId];
      if (!element || element.visible === false) {
          return null;
      }

      const resolvedContent = content ?? renderGenericBuilderElement(element);
      const isSelected = selectedEditorTarget?.type === 'element' && selectedEditorTarget.id === elementId;
      return (
          <div
              key={elementId}
              className={`b737-editable-element ${className || ''}${isSelected ? ' selected' : ''}${layoutDebug ? ' debug-active' : ''}`.trim()}
              data-b737-element-id={elementId}
              data-b737-region={element.region}
              style={{
                  left: `${element.x * 100}%`,
                  top: `${element.y * 100}%`,
                  width: `${element.width * 100}%`,
                  height: `${element.height * 100}%`,
                  zIndex: element.zIndex ?? 1
              }}
              onMouseDown={(event) => {
                  if (!layoutDebug || element.locked) {
                      return;
                  }
                  event.stopPropagation();
                  setSelectedEditorTarget({ type: 'element', id: elementId });
                  editorDragStateRef.current = {
                      targetType: 'element',
                      id: elementId,
                      startX: event.clientX,
                      startY: event.clientY,
                      originalX: element.x,
                      originalY: element.y,
                      width: element.width,
                      height: element.height,
                      groupMove: event.shiftKey
                  };
                  document.body.style.cursor = 'grabbing';
                  event.preventDefault();
              }}
              onClick={(event) => {
                  if (!layoutDebug) {
                      return;
                  }
                  event.stopPropagation();
                  setSelectedEditorTarget({ type: 'element', id: elementId });
              }}
          >
              {resolvedContent}
          </div>
      );
  };

  const B737PhotoPanel = () => (
      <div className="b737-photo-scale-shell" style={{ width: `${1268 * panelZoom}px`, height: `${920 * panelZoom}px` }}>
          <div className={`b737-photo-panel b737-photo-panel-editable ${builderStyleClass}`.trim()} style={{ transform: `scale(${panelZoom})`, transformOrigin: 'top left' }} onClick={() => layoutDebug && setSelectedEditorTarget(null)}>
              <div className="b737-edit-canvas">
              {alignmentGuides.map((guide, index) => (
                  <div
                      key={`${guide.axis}-${guide.value}-${index}`}
                      className={`b737-edit-guide ${guide.axis === 'x' ? 'x-guide' : 'y-guide'}`}
                      style={guide.axis === 'x' ? { left: `${guide.value * 100}%` } : { top: `${guide.value * 100}%` }}
                  />
              ))}
              {renderB737EditableElement('upperFlightControl', 'b737-edit-shell plate-shell', <B737UpperFlightControlPlate />)}
              {renderB737EditableElement('upperNav', 'b737-edit-shell plate-shell', <B737UpperNavPlate />)}
              {renderB737EditableElement('upperCall', 'b737-edit-shell slot-shell', <B737UpperCallPlate />)}
              {renderB737EditableElement('upperApu', 'b737-edit-shell plate-shell', <B737APUModule />)}
              {renderB737EditableElement('upperUtility', 'b737-edit-shell plate-shell', <B737UpperUtilityPlate />)}
              {renderB737EditableElement('upperTest', 'b737-edit-shell plate-shell', <B737UpperTestPlate />)}

              {renderB737EditableElement('mainElectrical', 'b737-edit-shell module-shell', <B737ElectricalWorkflowModule />)}
              {renderB737EditableElement('mainFuel', 'b737-edit-shell module-shell', <B737FuelWorkflowModule />)}
              {renderB737EditableElement('mainHydraulics', 'b737-edit-shell module-shell', <B737HydraulicWorkflowModule />)}
              {renderB737EditableElement('mainSpine', 'b737-edit-shell spine-shell', <B737CenterSpinePlate />)}
              {renderB737EditableElement('mainPneumatic', 'b737-edit-shell module-shell', <B737PneumaticWorkflowModule />)}
              {renderB737EditableElement('mainStart', 'b737-edit-shell module-shell', <B737StartWorkflowModule />)}
              {renderB737EditableElement('mainEnvironment', 'b737-edit-shell module-shell', <B737EnvironmentWorkflowModule />)}
              {renderB737EditableElement('mainPressurization', 'b737-edit-shell module-shell', <B737PressurizationWorkflowModule />)}
              {renderB737EditableElement('mainMonitor', 'b737-edit-shell plate-shell', <B737MonitorPlate />)}
              {renderB737EditableElement('mainAntiIce', 'b737-edit-shell module-shell', <B737AntiIceWorkflowModule />)}

              {renderB737EditableElement('footerLighting', 'b737-edit-shell footer-shell', <div className="b737-footer-lighting"><B737LightingWorkflowModule /></div>)}
              {renderB737EditableElement('footerUtility', 'b737-edit-shell footer-shell', <B737FooterUtilityPlate />)}
              {builderVisibleElements
                  .filter((element) => !fixedBuilderElementIds.has(element.id) && element.builderGenerated)
                  .map((element) => renderB737EditableElement(element.id, `b737-edit-shell generic-shell kind-${element.kind || 'module'}`))}
          </div>
      </div>
    </div>
  );

  const renderSectionById = (sectionId) => {
      const sectionMap = {
          adirs: ADIRSPanel,
          apu: APUPanel,
          b737Electrical: B737ElectricalPanel,
          b737FlightControl: B737FlightControlPanel,
          b737Fuel: B737FuelPanel,
          b737Ice: B737IcePanel,
          b737Misc: B737MiscPanel,
          b737Nav: B737NavPanel,
          comm: CommPanel,
          electrical: ElectricalPanel,
          engine: EnginePanel,
          fire: FirePanel,
          fuel: FuelPanel,
          hydraulics: HydraulicsPanel,
          iceRain: IceRainPanel,
          lights: LightsPanel,
          misc: MiscPanel,
          pneumatic: PneumaticPanel
      };
      const Section = sectionMap[sectionId];
      return Section ? <Section key={sectionId} /> : null;
  };

  const renderLayoutFromDefinition = () => {
      if (panelLayout.designVariant === 'b737Photo') {
          return <B737PhotoPanel />;
      }

      if (panelLayout.legacyVariant === 'airbus') {
          return (
              <div className={`airbus-overhead-grid airbus-overhead-grid-${panelLayout.id}`}>
                  {panelLayout.columns.map((group) => (
                      <div key={group.area} className={`overhead-layout-cell overhead-area-${group.area}`} style={{ gridArea: group.area }}>
                          {group.sections.map(renderSectionById)}
                      </div>
                  ))}
              </div>
          );
      }

      const gap = panelLayout.legacyVariant === 'b737' ? '5px' : '8px';
      return (
          <div className={`b737-overhead-grid boeing-overhead-grid-${panelLayout.id}`}>
              {panelLayout.columns.map((group) => (
                  <div key={group.column} className={`overhead-layout-cell overhead-column-${group.column}`} style={{ gridArea: group.column, display: 'flex', flexDirection: 'column', gap }}>
                      {group.sections.map(renderSectionById)}
                  </div>
              ))}
          </div>
      );
  };

  return (
    <div className="overhead-overlay">
      <div
        className={`overhead-container${editorFullscreen ? ' overhead-container-fullscreen' : ''}`}
        style={{ transform: `translate(${panelPosition.x}px, ${panelPosition.y}px)` }}
      >
        <div className="overhead-drag-handle" onMouseDown={startDrag}>
          <span>{panelLayout.id.replace(/_/g, ' ').toUpperCase()}</span>
          <div className="overhead-title-actions">
            {panelLayout.designVariant === 'b737Photo' && (
              <>
                <div className="overhead-zoom-controls">
                  <button
                    type="button"
                    className="overhead-toolbar-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPanelZoom((current) => Math.max(0.5, Number((current - 0.1).toFixed(2))));
                    }}
                  >
                    -
                  </button>
                  <span className="overhead-zoom-label">{Math.round(panelZoom * 100)}%</span>
                  <button
                    type="button"
                    className="overhead-toolbar-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPanelZoom((current) => Math.min(1.8, Number((current + 0.1).toFixed(2))));
                    }}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="overhead-toolbar-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPanelZoom(1);
                    }}
                  >
                    100%
                  </button>
                </div>
                <button
                  type="button"
                  className={`overhead-toolbar-btn${editorFullscreen ? ' active' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setEditorFullscreen((current) => !current);
                  }}
                >
                  {editorFullscreen ? 'Fullscreen' : 'Windowed'}
                </button>
                <button
                  type="button"
                  className={`overhead-toolbar-btn${layoutDebug ? ' active' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setLayoutDebug((current) => {
                      const next = !current;
                      if (!next) {
                        setSelectedEditorTarget(null);
                        setAlignmentGuides([]);
                      }
                      return next;
                    });
                  }}
                >
                  {layoutDebug ? 'Editor On' : 'Editor Off'}
                </button>
                <button
                  type="button"
                  className={`overhead-toolbar-btn${builderMode ? ' active' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setBuilderMode((current) => !current);
                  }}
                >
                  {builderMode ? 'Builder On' : 'Builder Off'}
                </button>
              </>
            )}
            <span className="overhead-drag-hint">Drag</span>
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>X</button>

          <div
            className={`overhead-grid overhead-grid-${panelLayout.legacyVariant} overhead-layout-${panelLayout.id}${editorFullscreen ? ' overhead-grid-fullscreen' : ''}`}
          >
            {renderLayoutFromDefinition()}
        </div>

        {panelLayout.designVariant === 'b737Photo' && layoutDebug && (
          <div className={`b737-layout-editor-panel${editorFullscreen ? ' b737-layout-editor-panel-fullscreen-mode' : ''}`} style={{ transform: `translate(${editorPanelPosition.x}px, ${editorPanelPosition.y}px)` }}>
            <div className="b737-layout-editor-header b737-floating-panel-handle" onMouseDown={(event) => startFloatingPanelDrag('editor', event)}>
              <span>737 Layout Editor</span>
              <span className="b737-layout-editor-hint">Shift drag = group move</span>
            </div>
            <div className="b737-layout-editor-actions">
              <button type="button" onClick={exportB737EditorLayout}>Export</button>
              <button type="button" onClick={() => editorFileInputRef.current?.click()}>Import</button>
              <button type="button" onClick={resetB737EditorLayout}>Reset</button>
              <input
                ref={editorFileInputRef}
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={importB737EditorLayout}
              />
            </div>
            <div className="b737-layout-editor-body">
              <div><strong>Selection:</strong> {selectedEditorTarget ? `${selectedEditorTarget.type}:${selectedEditorTarget.id}` : 'None'}</div>
              {selectedB737Target && (
                <>
                  {'region' in selectedB737Target && <div><strong>Region:</strong> {selectedB737Target.region}</div>}
                  {'parentId' in selectedB737Target && <div><strong>Parent:</strong> {selectedB737Target.parentId}</div>}
                  <div><strong>X:</strong> {selectedB737Target.x.toFixed(4)}</div>
                  <div><strong>Y:</strong> {selectedB737Target.y.toFixed(4)}</div>
                  <div><strong>W:</strong> {selectedB737Target.width.toFixed(4)}</div>
                  <div><strong>H:</strong> {selectedB737Target.height.toFixed(4)}</div>
                  {'groupId' in selectedB737Target && selectedB737Target.groupId && <div><strong>Group:</strong> {selectedB737Target.groupId}</div>}
                  <div><strong>Locked:</strong> {selectedB737Target.locked ? 'Yes' : 'No'}</div>
                  <div><strong>Visible:</strong> {selectedB737Target.visible === false ? 'No' : 'Yes'}</div>
                </>
              )}
            </div>
            {selectedEditorTarget?.type === 'element' && selectedB737Target?.builderGenerated && (
              <div className="b737-layout-editor-body b737-builder-inspector">
                <div><strong>Builder inspector</strong></div>
                <div><strong>Kind:</strong> {selectedB737Target.kind || 'module'}</div>
                <label>
                  <span>Label</span>
                  <input
                    type="text"
                    value={selectedB737Target.builderLabel || ''}
                    onChange={(event) => updateB737ElementDetails(selectedB737Target.id, { builderLabel: event.target.value })}
                  />
                </label>
                <label>
                  <span>Subsystem</span>
                  <input
                    type="text"
                    value={selectedB737Target.purpose?.subsystem || ''}
                    onChange={(event) => updateB737ElementPurposeField(selectedB737Target.id, 'subsystem', event.target.value)}
                    placeholder="electrical / fuel / apu"
                  />
                </label>
                <label>
                  <span>Role</span>
                  <input
                    type="text"
                    value={selectedB737Target.purpose?.role || ''}
                    onChange={(event) => updateB737ElementPurposeField(selectedB737Target.id, 'role', event.target.value)}
                    placeholder="e.g. APU master"
                  />
                </label>
                <label>
                  <span>Notes</span>
                  <input
                    type="text"
                    value={selectedB737Target.purpose?.notes || ''}
                    onChange={(event) => updateB737ElementPurposeField(selectedB737Target.id, 'notes', event.target.value)}
                    placeholder="function mapping / parameter notes"
                  />
                </label>
                <label>
                  <span>Read path</span>
                  <input
                    type="text"
                    value={selectedB737Target.readBinding?.path || ''}
                    onChange={(event) => updateB737ElementBindingField(selectedB737Target.id, 'readBinding', 'path', event.target.value)}
                    placeholder="systems.path"
                  />
                </label>
                <label>
                  <span>Read default</span>
                  <input
                    type="text"
                    value={selectedB737Target.readBinding?.defaultValue ?? ''}
                    onChange={(event) => updateB737ElementBindingField(selectedB737Target.id, 'readBinding', 'defaultValue', event.target.value)}
                    placeholder="false / 0 / text"
                  />
                </label>
                <label>
                  <span>Read transform</span>
                  <select
                    value={selectedB737Target.readBinding?.transform || 'raw'}
                    onChange={(event) => updateB737ElementBindingField(selectedB737Target.id, 'readBinding', 'transform', event.target.value)}
                  >
                    <option value="raw">raw</option>
                    <option value="boolean">boolean</option>
                    <option value="number">number</option>
                    <option value="percentage">percentage</option>
                  </select>
                </label>
                <label>
                  <span>Write system</span>
                  <input
                    type="text"
                    value={selectedB737Target.writeBinding?.system || ''}
                    onChange={(event) => updateB737ElementBindingField(selectedB737Target.id, 'writeBinding', 'system', event.target.value)}
                    placeholder="apu"
                  />
                </label>
                <label>
                  <span>Write action</span>
                  <input
                    type="text"
                    value={selectedB737Target.writeBinding?.action || ''}
                    onChange={(event) => updateB737ElementBindingField(selectedB737Target.id, 'writeBinding', 'action', event.target.value)}
                    placeholder="master"
                  />
                </label>
                <label>
                  <span>Write value</span>
                  <input
                    type="text"
                    value={selectedB737Target.writeBinding?.value ?? ''}
                    onChange={(event) => updateB737ElementBindingField(selectedB737Target.id, 'writeBinding', 'value', event.target.value)}
                    placeholder="optional explicit value"
                  />
                </label>
                <label>
                  <span>Write mode</span>
                  <select
                    value={selectedB737Target.writeBinding?.mode || 'toggle'}
                    onChange={(event) => updateB737ElementBindingField(selectedB737Target.id, 'writeBinding', 'mode', event.target.value)}
                  >
                    <option value="toggle">toggle</option>
                    <option value="set">set</option>
                    <option value="momentary">momentary</option>
                  </select>
                </label>
                <label>
                  <span>Visible when</span>
                  <input
                    type="text"
                    value={getConditionPreview(selectedB737Target.conditions?.visibleWhen)}
                    onChange={(event) => updateB737ElementConditionField(selectedB737Target.id, 'visibleWhen', parseConditionInput(event.target.value))}
                    placeholder='path or {"truthy":"path"}'
                  />
                </label>
                <label>
                  <span>Active when</span>
                  <input
                    type="text"
                    value={getConditionPreview(selectedB737Target.conditions?.activeWhen)}
                    onChange={(event) => updateB737ElementConditionField(selectedB737Target.id, 'activeWhen', parseConditionInput(event.target.value))}
                    placeholder='path or {"gt":{"path":"x","value":1}}'
                  />
                </label>
                <label>
                  <span>Fault when</span>
                  <input
                    type="text"
                    value={getConditionPreview(selectedB737Target.conditions?.faultWhen)}
                    onChange={(event) => updateB737ElementConditionField(selectedB737Target.id, 'faultWhen', parseConditionInput(event.target.value))}
                    placeholder='path or {"eq":{"path":"x","value":"FAIL"}}'
                  />
                </label>
                {selectedB737Target.kind === 'radialGauge' && (
                  <>
                    <label>
                      <span>Gauge min</span>
                      <input
                        type="number"
                        value={selectedB737Target.props?.min ?? 0}
                        onChange={(event) => updateB737ElementPropsField(selectedB737Target.id, 'min', Number(event.target.value))}
                      />
                    </label>
                    <label>
                      <span>Gauge max</span>
                      <input
                        type="number"
                        value={selectedB737Target.props?.max ?? 100}
                        onChange={(event) => updateB737ElementPropsField(selectedB737Target.id, 'max', Number(event.target.value))}
                      />
                    </label>
                    <label>
                      <span>Unit</span>
                      <input
                        type="text"
                        value={selectedB737Target.props?.unit || ''}
                        onChange={(event) => updateB737ElementPropsField(selectedB737Target.id, 'unit', event.target.value)}
                        placeholder="psi / % / °C"
                      />
                    </label>
                    <label>
                      <span>Sweep start</span>
                      <input
                        type="number"
                        value={selectedB737Target.props?.sweepStart ?? -120}
                        onChange={(event) => updateB737ElementPropsField(selectedB737Target.id, 'sweepStart', Number(event.target.value))}
                      />
                    </label>
                    <label>
                      <span>Sweep end</span>
                      <input
                        type="number"
                        value={selectedB737Target.props?.sweepEnd ?? 120}
                        onChange={(event) => updateB737ElementPropsField(selectedB737Target.id, 'sweepEnd', Number(event.target.value))}
                      />
                    </label>
                  </>
                )}
                {selectedB737Target.kind === 'valueIndicator' && (
                  <label>
                    <span>Display unit</span>
                    <input
                      type="text"
                      value={selectedB737Target.props?.unit || ''}
                      onChange={(event) => updateB737ElementPropsField(selectedB737Target.id, 'unit', event.target.value)}
                      placeholder="psi / % / °C"
                    />
                  </label>
                )}
                {selectedB737Target.kind === 'pipeSegment' && (
                  <>
                    <label>
                      <span>From X</span>
                      <input
                        type="number"
                        step="0.001"
                        value={selectedB737Target.props?.from?.x ?? selectedB737Target.x}
                        onChange={(event) => updateB737ElementPropsField(selectedB737Target.id, 'from', { ...(selectedB737Target.props?.from || {}), x: Number(event.target.value) })}
                      />
                    </label>
                    <label>
                      <span>From Y</span>
                      <input
                        type="number"
                        step="0.001"
                        value={selectedB737Target.props?.from?.y ?? selectedB737Target.y}
                        onChange={(event) => updateB737ElementPropsField(selectedB737Target.id, 'from', { ...(selectedB737Target.props?.from || {}), y: Number(event.target.value) })}
                      />
                    </label>
                    <label>
                      <span>To X</span>
                      <input
                        type="number"
                        step="0.001"
                        value={selectedB737Target.props?.to?.x ?? (selectedB737Target.x + selectedB737Target.width)}
                        onChange={(event) => updateB737ElementPropsField(selectedB737Target.id, 'to', { ...(selectedB737Target.props?.to || {}), x: Number(event.target.value) })}
                      />
                    </label>
                    <label>
                      <span>To Y</span>
                      <input
                        type="number"
                        step="0.001"
                        value={selectedB737Target.props?.to?.y ?? (selectedB737Target.y + selectedB737Target.height)}
                        onChange={(event) => updateB737ElementPropsField(selectedB737Target.id, 'to', { ...(selectedB737Target.props?.to || {}), y: Number(event.target.value) })}
                      />
                    </label>
                    <label>
                      <span>Line width</span>
                      <input
                        type="number"
                        value={selectedB737Target.props?.lineWidth ?? 3}
                        onChange={(event) => updateB737ElementPropsField(selectedB737Target.id, 'lineWidth', Number(event.target.value))}
                      />
                    </label>
                    <label>
                      <span>Inactive color</span>
                      <input
                        type="text"
                        value={selectedB737Target.props?.inactiveColor || '#3f4a51'}
                        onChange={(event) => updateB737ElementPropsField(selectedB737Target.id, 'inactiveColor', event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Active color</span>
                      <input
                        type="text"
                        value={selectedB737Target.props?.activeColor || '#42d7ff'}
                        onChange={(event) => updateB737ElementPropsField(selectedB737Target.id, 'activeColor', event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Fault color</span>
                      <input
                        type="text"
                        value={selectedB737Target.props?.faultColor || '#ff8c42'}
                        onChange={(event) => updateB737ElementPropsField(selectedB737Target.id, 'faultColor', event.target.value)}
                      />
                    </label>
                  </>
                )}
              </div>
            )}
            {selectedEditorTarget && (
              <div className="b737-layout-editor-actions compact">
                <button
                  type="button"
                  onClick={() => selectedEditorTarget.type === 'control'
                    ? toggleB737ControlElementFlag(selectedEditorTarget.id, 'locked')
                    : (selectedEditorTarget.type === 'child'
                      ? toggleB737ChildElementFlag(selectedEditorTarget.id, 'locked')
                      : toggleB737ElementFlag(selectedEditorTarget.id, 'locked'))}
                >
                  {selectedB737Target?.locked ? 'Unlock' : 'Lock'}
                </button>
                <button
                  type="button"
                  onClick={() => selectedEditorTarget.type === 'control'
                    ? toggleB737ControlElementFlag(selectedEditorTarget.id, 'visible')
                    : (selectedEditorTarget.type === 'child'
                      ? toggleB737ChildElementFlag(selectedEditorTarget.id, 'visible')
                      : toggleB737ElementFlag(selectedEditorTarget.id, 'visible'))}
                >
                  {selectedB737Target?.visible === false ? 'Show' : 'Hide'}
                </button>
              </div>
            )}
            <div className="b737-layout-editor-footer">
              Arrows nudge. Shift = larger step. Alt + arrows = move element group. Ctrl/Cmd + arrows = resize selected child/control.
            </div>
          </div>
        )}

        {panelLayout.designVariant === 'b737Photo' && builderMode && <B737ScratchBuilderPanel docked={editorFullscreen} />}
      </div>
      
      {/* Inline Styles for convenience, ideally move to CSS */}
      <style>{`
        .overhead-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); z-index: 2000;
            display: flex; justify-content: center; align-items: center;
            overflow: auto;
            padding: 16px;
            box-sizing: border-box;
        }
        .overhead-container {
            width: min(1180px, calc(100vw - 32px));
            height: min(900px, calc(100vh - 32px));
            min-height: 720px;
            background: #252525;
            border: 4px solid #444; border-radius: 10px;
            display: flex;
            flex-direction: column;
            padding: 10px;
            color: #eee;
            font-family: 'Roboto', sans-serif;
            box-shadow: 0 0 50px #000;
            position: relative;
            overflow: hidden;
        }
        .overhead-drag-handle {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin: -10px -10px 10px -10px;
            padding: 10px 44px 10px 14px;
            background: linear-gradient(180deg, #3a3a3a, #2b2b2b);
            border-bottom: 1px solid #555;
            border-radius: 6px 6px 0 0;
            cursor: move;
            user-select: none;
            font-size: 12px;
            font-weight: bold;
            letter-spacing: 0.08em;
        }
        .overhead-title-actions {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .overhead-toolbar-btn {
            border: 1px solid #6d7378;
            background: #1f2326;
            color: #d8dde0;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            cursor: pointer;
            letter-spacing: 0.04em;
        }
        .overhead-toolbar-btn.active {
            background: #0d3b46;
            border-color: #4ec7dd;
            color: #b9f5ff;
        }
        .overhead-container-fullscreen {
            width: calc(100vw - 24px);
            height: calc(100vh - 24px);
            min-height: 0;
        }
        .b737-layout-editor-panel-docked {
            position: relative;
            top: auto;
            right: auto;
            width: min(360px, 28vw);
            max-height: none;
            height: 100%;
            transform: none !important;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .b737-layout-editor-panel-fullscreen-mode {
            display: none;
        }
        .b737-editor-fullscreen-shell {
            position: absolute;
            top: 62px;
            right: 14px;
            bottom: 14px;
            width: min(760px, 42vw);
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 28;
            pointer-events: none;
        }
        .b737-editor-fullscreen-topbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            border: 1px solid #4a5963;
            border-radius: 6px;
            background: rgba(7, 11, 14, 0.92);
            color: #dce3e8;
            pointer-events: auto;
        }
        .b737-editor-fullscreen-title {
            display: grid;
            gap: 2px;
            font-family: monospace;
            font-size: 11px;
        }
        .b737-editor-fullscreen-title span {
            color: #8fb7c4;
            font-size: 10px;
        }
        .b737-editor-fullscreen-panels {
            min-height: 0;
            flex: 1;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 10px;
            pointer-events: auto;
        }
        .b737-builder-panel {
            top: 62px;
            right: 296px;
            width: 320px;
            max-height: calc(100% - 84px);
            overflow: auto;
        }
        .b737-layout-editor-panel {
            position: absolute;
            top: 62px;
            right: 14px;
            width: 270px;
            max-height: calc(100% - 84px);
            background: rgba(7, 11, 14, 0.92);
            border: 1px solid #4a5963;
            box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
            color: #dce3e8;
            font-family: monospace;
            font-size: 11px;
            padding: 10px;
            border-radius: 6px;
            z-index: 30;
            pointer-events: auto;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-sizing: border-box;
        }
        .b737-layout-editor-header {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #33414a;
            font-weight: bold;
            flex: 0 0 auto;
        }
        .b737-floating-panel-handle {
            cursor: move;
            user-select: none;
        }
        .b737-layout-editor-hint {
            color: #8fb7c4;
            font-size: 10px;
        }
        .b737-layout-editor-actions {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            margin-bottom: 8px;
            flex: 0 0 auto;
        }
        .b737-layout-editor-actions.compact {
            margin-top: 8px;
            margin-bottom: 4px;
        }
        .b737-layout-editor-actions button {
            border: 1px solid #55656f;
            background: #192126;
            color: #dce3e8;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 10px;
            cursor: pointer;
        }
        .b737-layout-editor-body {
            display: grid;
            gap: 3px;
            padding: 6px 0;
            border-top: 1px solid #26323a;
            border-bottom: 1px solid #26323a;
            overflow-y: auto;
            overflow-x: hidden;
            min-height: 0;
            flex: 1 1 auto;
            overscroll-behavior: contain;
        }
        .b737-builder-inspector {
            gap: 6px;
            margin-top: 8px;
        }
        .b737-builder-inspector label {
            display: grid;
            gap: 4px;
        }
        .b737-builder-inspector input,
        .b737-builder-inspector select {
            width: 100%;
            box-sizing: border-box;
            border: 1px solid #55656f;
            background: #192126;
            color: #dce3e8;
            padding: 4px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-family: monospace;
        }
        .b737-builder-inspector span {
            color: #8fb7c4;
            font-size: 10px;
        }
        .b737-layout-editor-footer {
            margin-top: 8px;
            color: #92a7b2;
            line-height: 1.35;
        }
        .b737-builder-style-row {
            display: grid;
            gap: 6px;
            margin-bottom: 8px;
        }
        .b737-builder-style-pills {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
        }
        .b737-builder-pill {
            border: 1px solid #55656f;
            background: #192126;
            color: #dce3e8;
            padding: 4px 8px;
            border-radius: 999px;
            font-size: 10px;
            cursor: pointer;
            text-transform: capitalize;
        }
        .b737-builder-pill.active {
            background: #0d3b46;
            border-color: #4ec7dd;
            color: #b9f5ff;
        }
        .b737-builder-summary {
            margin-bottom: 8px;
            flex: 0 0 auto;
        }
        .b737-builder-catalog {
            display: grid;
            gap: 8px;
            overflow-y: auto;
            overflow-x: hidden;
            min-height: 0;
            padding-right: 2px;
            flex: 1 1 auto;
            overscroll-behavior: contain;
        }
        .b737-builder-catalog-group {
            border-top: 1px solid #26323a;
            padding-top: 8px;
        }
        .b737-builder-catalog-title {
            font-weight: bold;
            color: #8fb7c4;
            margin-bottom: 6px;
        }
        .b737-builder-catalog-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
        }
        .b737-builder-catalog-row button {
            border: 1px solid #55656f;
            background: #192126;
            color: #dce3e8;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 10px;
            cursor: pointer;
        }
        .b737-builder-catalog-row em {
            color: #8fb7c4;
            font-style: normal;
        }
        .b737-builder-generic {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
        }
        .b737-builder-shell,
        .b737-builder-placeholder {
            flex-direction: column;
            gap: 6px;
            border: 1px dashed rgba(220, 227, 232, 0.45);
            background: rgba(19, 26, 31, 0.55);
            color: #dce3e8;
            border-radius: 6px;
            text-align: center;
            font-size: 10px;
            padding: 6px;
        }
        .b737-builder-placeholder {
            background: rgba(53, 36, 18, 0.55);
            border-color: rgba(255, 196, 107, 0.55);
        }
        .b737-builder-generic-annunciator,
        .b737-builder-generic-schematic {
            flex-direction: column;
            gap: 6px;
        }
        .b737-builder-generic-schematic svg {
            width: 100%;
            height: 100%;
        }
        .b737-builder-style-flat .b737-builder-shell,
        .b737-builder-style-flat .b737-builder-placeholder {
            background: rgba(58, 62, 68, 0.92);
            border-color: #767d86;
        }
        .b737-builder-style-blueprint .b737-builder-shell,
        .b737-builder-style-blueprint .b737-builder-placeholder {
            background: rgba(20, 73, 108, 0.82);
            border-color: #71c3f3;
            color: #c8f1ff;
        }
        .overhead-drag-hint {
            font-size: 10px;
            color: #bbb;
            font-weight: normal;
            letter-spacing: 0;
        }
        .overhead-zoom-controls {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .overhead-zoom-label {
            min-width: 42px;
            text-align: center;
            font-size: 10px;
            color: #cfe7ee;
        }
        .close-btn {
            position: absolute; top: 10px; right: 10px;
            background: #c00; color: white; border: 1px solid #fff; 
            width: 24px; height: 24px;
            font-weight: bold; cursor: pointer; border-radius: 4px;
            z-index: 10; display: flex; align-items: center; justify-content: center;
        }
        .overhead-grid {
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;
            flex: 1; overflow: auto;
            transform: none;
            transform-origin: center top;
            position: relative;
            z-index: 1;
            padding: 4px;
            border-radius: 6px;
            background: linear-gradient(180deg, #303235 0%, #191a1c 100%);
            border: 1px solid #555;
            min-height: 0;
            min-width: 0;
        }
        .overhead-grid-fullscreen {
            padding-right: min(780px, 44vw);
        }

        .b737-overhead-grid {
            display: grid;
            grid-template-columns: 1.05fr 0.95fr 1.05fr;
            grid-template-areas: "col1 col2 col3";
            gap: 5px;
            height: 100%;
        }
        .b737-photo-scale-shell {
            position: relative;
            width: 1268px;
            height: 920px;
        }
        .b737-photo-panel {
            min-width: 1240px;
            min-height: 900px;
            width: max-content;
            height: max-content;
            display: block;
            padding: 8px 14px 12px;
            background: linear-gradient(180deg, #3a3d40 0%, #232628 45%, #17191b 100%);
            border: 2px solid #555;
            border-radius: 10px 10px 22px 22px;
            box-shadow: inset 0 0 28px rgba(0,0,0,0.65);
        }
        .b737-builder-style-classic {
        }
        .b737-builder-style-flat {
            background: linear-gradient(180deg, #2b2d31 0%, #1f2124 100%);
            border-color: #6a7077;
            box-shadow: inset 0 0 0 rgba(0,0,0,0.0);
        }
        .b737-builder-style-flat .b737-module,
        .b737-builder-style-flat .b737-upper-plate,
        .b737-builder-style-flat .b737-slot-plate,
        .b737-builder-style-flat .b737-footer-utility-plate,
        .b737-builder-style-flat .b737-footer-lighting,
        .b737-builder-style-flat .b737-center-spine,
        .b737-builder-style-flat .b737-special-monitor-plate {
            background: #3a3e44;
            box-shadow: none;
            border-color: #767d86;
        }
        .b737-builder-style-blueprint {
            background: linear-gradient(180deg, #113047 0%, #0a1d2c 100%);
            border-color: #3b92c4;
        }
        .b737-builder-style-blueprint .b737-module,
        .b737-builder-style-blueprint .b737-upper-plate,
        .b737-builder-style-blueprint .b737-slot-plate,
        .b737-builder-style-blueprint .b737-footer-utility-plate,
        .b737-builder-style-blueprint .b737-footer-lighting,
        .b737-builder-style-blueprint .b737-center-spine,
        .b737-builder-style-blueprint .b737-special-monitor-plate {
            background: rgba(20, 73, 108, 0.9);
            border-color: #71c3f3;
            box-shadow: inset 0 0 0 1px rgba(167, 227, 255, 0.18);
        }
        .b737-builder-style-blueprint .b737-local-label,
        .b737-builder-style-blueprint .b737-module-title {
            color: #c8f1ff;
        }
        .b737-photo-panel-editable {
            position: relative;
        }
        .b737-edit-canvas {
            position: relative;
            width: 1240px;
            height: 900px;
            min-height: 900px;
        }
        .b737-edit-guide {
            position: absolute;
            background: rgba(92, 223, 255, 0.72);
            pointer-events: none;
            z-index: 25;
        }
        .b737-edit-guide.x-guide {
            top: 0;
            bottom: 0;
            width: 1px;
        }
        .b737-edit-guide.y-guide {
            left: 0;
            right: 0;
            height: 1px;
        }
        .b737-editable-element {
            position: absolute;
            box-sizing: border-box;
        }
        .b737-editable-element.debug-active {
            outline: 1px dashed rgba(91, 181, 214, 0.35);
            outline-offset: 2px;
        }
        .b737-editable-element.selected {
            outline: 2px solid #59d7ff;
            outline-offset: 2px;
            box-shadow: 0 0 0 1px rgba(10, 32, 39, 0.9), 0 0 14px rgba(89, 215, 255, 0.28);
        }
        .b737-module-child-editor {
            position: absolute;
            box-sizing: border-box;
        }
        .b737-module-child-editor.debug-active {
            outline: 1px dashed rgba(255, 193, 92, 0.4);
            outline-offset: 1px;
        }
        .b737-module-child-editor.selected {
            outline: 2px solid #ffc15c;
            outline-offset: 1px;
            box-shadow: 0 0 10px rgba(255, 193, 92, 0.2);
        }
        .b737-module-control-editor {
            position: absolute;
            box-sizing: border-box;
        }
        .b737-module-control-editor.debug-active {
            outline: 1px dashed rgba(171, 250, 125, 0.45);
            outline-offset: 1px;
        }
        .b737-module-control-editor.selected {
            outline: 2px solid #abfa7d;
            outline-offset: 1px;
            box-shadow: 0 0 10px rgba(171, 250, 125, 0.25);
        }
        .b737-editor-resize-handle {
            position: absolute;
            right: -5px;
            bottom: -5px;
            width: 10px;
            height: 10px;
            border-radius: 2px;
            background: #ffc15c;
            border: 1px solid rgba(0, 0, 0, 0.55);
            cursor: nwse-resize;
            z-index: 6;
        }
        .b737-editor-resize-handle.control-handle {
            background: #abfa7d;
        }
        .b737-edit-shell {
            display: flex;
        }
        .b737-edit-shell > * {
            width: 100%;
            height: 100%;
        }
        .b737-edit-shell.module-shell .b737-module,
        .b737-edit-shell.plate-shell .b737-upper-plate,
        .b737-edit-shell.plate-shell .b737-special-monitor-plate,
        .b737-edit-shell.slot-shell .b737-slot-plate,
        .b737-edit-shell.footer-shell .b737-footer-lighting,
        .b737-edit-shell.footer-shell .b737-footer-utility-plate,
        .b737-edit-shell.spine-shell .b737-center-spine {
            width: 100%;
            height: 100%;
        }
        .b737-edit-shell.footer-shell .b737-lighting-module {
            height: 100%;
        }
        .b737-topology-upper {
            display: grid;
            gap: 4px;
            align-items: stretch;
        }
        .b737-topology-upper-5col {
            grid-template-columns: 1.18fr 1.05fr 0.32fr 1.06fr 1.18fr;
        }
        .b737-main-field-5col {
            grid-template-columns: 1.12fr 1.02fr 0.16fr 1.1fr 1.14fr;
        }
        .b737-upper-band-right-outer,
        .b737-right-outer-band,
        .b737-upper-band-left-outer,
        .b737-upper-band-left-inner,
        .b737-upper-band-right-inner,
        .b737-left-outer-band,
        .b737-left-inner-band,
        .b737-right-inner-band {
            display: grid;
            gap: 4px;
            align-content: start;
        }
        .b737-upper-plate,
        .b737-slot-plate,
        .b737-special-monitor-plate,
        .b737-footer-utility {
            border: 1px solid #5e6368;
            background: linear-gradient(180deg, #2c2f33, #1a1c1e);
            box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
            padding: 4px;
        }
        .b737-upper-plate {
            min-height: 88px;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            gap: 4px;
        }
        .b737-upper-slot {
            display: flex;
        }
        .b737-slot-plate {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            background: linear-gradient(180deg, #242729, #17191b);
        }
        .b737-upper-dense-row {
            display: flex;
            align-items: center;
            gap: 2px;
            flex-wrap: wrap;
        }
        .b737-upper-dense-row-flight {
            justify-content: flex-start;
        }
        .b737-top-annunciator-stack {
            display: flex;
            flex-direction: column;
            gap: 2px;
            align-items: flex-start;
        }
        .b737-nav-row,
        .b737-utility-row,
        .b737-apu-row,
        .b737-monitor-row,
        .b737-monitor-status {
            align-items: center;
            justify-content: flex-start;
        }
        .b737-top-status-tight {
            margin-top: -2px;
        }
        .b737-upper-test-grid {
            display: grid;
            grid-template-columns: repeat(2, max-content);
            gap: 4px 6px;
            margin-top: 4px;
            align-content: start;
        }
        .b737-guarded-control {
            position: relative;
            padding-top: 8px;
        }
        .b737-switch-guard {
            position: absolute;
            top: 0;
            left: 8px;
            width: 26px;
            height: 10px;
            background: linear-gradient(180deg, #6d0000, #2c0000);
            border: 1px solid #400;
            border-radius: 2px 2px 0 0;
            z-index: 2;
        }
        .b737-schematic-panel {
            position: relative;
            overflow: hidden;
        }
        .b737-schematic-lines {
            position: absolute;
            inset: 20px 6px 14px 6px;
            width: calc(100% - 12px);
            height: calc(100% - 34px);
            pointer-events: none;
            opacity: 0.38;
        }
        .b737-schematic-lines path,
        .b737-schematic-lines circle,
        .b737-schematic-lines rect {
            stroke: #d9ddd8;
            stroke-width: 1.4;
            fill: none;
        }
        .b737-schematic-lines .b737-schematic-muted {
            stroke: #8e948f;
            stroke-dasharray: 3 3;
        }
        .b737-schematic-lines .b737-schematic-frame {
            stroke: #929892;
            fill: rgba(0, 0, 0, 0.12);
        }
        .b737-analog-face {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            border: 2px solid #8a8e91;
            background: radial-gradient(circle at 50% 38%, #3e4245, #181a1c 72%);
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #e8eadf;
            font-size: 8px;
            flex-direction: column;
        }
        .b737-analog-needle {
            position: absolute;
            width: 2px;
            height: 22px;
            background: #f0f0e8;
            bottom: 28px;
            transform-origin: bottom center;
        }
        .b737-analog-label {
            position: absolute;
            bottom: 10px;
            font-size: 7px;
            letter-spacing: 0.08em;
        }
        .b737-analog-value {
            position: absolute;
            top: 14px;
            font-size: 8px;
            font-family: monospace;
        }
        .b737-mini-push {
            min-width: 26px;
            height: 16px;
            border: 1px solid #707477;
            background: linear-gradient(180deg, #4a4f52, #25282a);
            color: #ddd;
            font-size: 7px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4px;
        }
        .b737-editor-switch-core {
            position: relative;
            width: 100%;
            height: 100%;
            cursor: pointer;
        }
        .b737-editor-switch-base {
            position: absolute;
            top: 10%;
            left: 12%;
            right: 12%;
            bottom: 18%;
            background: #888;
            border-radius: 50%;
            box-shadow: inset 0 0 5px #000;
            border: 1px solid #555;
        }
        .b737-editor-switch-lever {
            position: absolute;
            left: 34%;
            width: 32%;
            height: 42%;
            background: linear-gradient(90deg, #d0d0d0, #f8f8f8, #a0a0a0);
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.5);
            transition: top 0.15s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 2;
        }
        .b737-editor-switch-cap {
            width: 100%;
            height: 16%;
            background: rgba(255,255,255,0.8);
            border-radius: 8px 8px 0 0;
        }
        .b737-editor-switch-label-stack {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #eee;
            text-align: center;
            font-weight: bold;
            text-shadow: 0 1px 2px #000;
            line-height: 1.05;
        }
        .b737-editor-switch-label-stack span {
            font-size: 10px;
        }
        .b737-editor-switch-label-stack small {
            font-size: 8px;
            color: #ccc;
        }
        .b737-annunciator-strip {
            margin-bottom: 2px;
        }
        .b737-main-field {
            display: grid;
            gap: 4px;
            min-height: 0;
        }
        .b737-left-zone,
        .b737-right-center-zone,
        .b737-far-right-zone {
            display: grid;
            gap: 4px;
            align-content: start;
            min-height: 0;
        }
        .b737-right-center-zone {
            grid-template-rows: 1fr auto;
        }
        .b737-right-cluster-top,
        .b737-right-cluster-bottom {
            display: grid;
            grid-template-columns: 1.08fr 0.92fr;
            gap: 4px;
        }
        .b737-right-cluster-bottom {
            align-items: start;
        }
        .b737-center-spine {
            display: flex;
            justify-content: center;
            background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.24));
            border-left: 1px solid #6a6d70;
            border-right: 1px solid #6a6d70;
            padding: 3px 1px;
            min-height: 100%;
        }
        .b737-spine-stack {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            width: 100%;
        }
        .b737-spine-segment {
            width: 100%;
            border-top: 1px solid #5f6366;
            border-bottom: 1px solid #232628;
            padding: 4px 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
        }
        .b737-bleed-top-row,
        .b737-bleed-status-row,
        .b737-air-top-row,
        .b737-air-status-row,
        .b737-hyd-top-row,
        .b737-hyd-status-row,
        .b737-hyd-switch-row,
        .b737-press-top-row,
        .b737-press-status-row,
        .b737-press-bottom-row {
            justify-content: flex-start;
            align-items: center;
        }
        .b737-bleed-grid-structured {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            align-items: start;
        }
        .b737-ice-stack {
            display: grid;
            gap: 4px;
            margin-top: 4px;
        }
        .b737-ice-row {
            display: grid;
            grid-template-columns: max-content 1fr;
            gap: 4px;
            align-items: center;
        }
        .b737-ice-row .metallic-switch-wrapper {
            justify-self: start;
        }
        .b737-footer-band {
            display: grid;
            grid-template-columns: 1.5fr 0.8fr;
            gap: 4px;
            align-items: stretch;
        }
        .b737-bottom-groups {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 4px;
            height: 100%;
        }
        .b737-bottom-group {
            border: 1px solid #596066;
            background: linear-gradient(180deg, #2b2f32, #17191b);
            padding: 3px;
            display: flex;
            flex-wrap: wrap;
            gap: 2px;
            align-items: flex-start;
            min-height: 82px;
            height: 100%;
            box-sizing: border-box;
        }
        .b737-footer-lighting {
            height: 100%;
        }
        .b737-footer-lighting .b737-lighting-module {
            height: 100%;
        }
        .b737-lighting-module,
        .b737-footer-utility,
        .b737-footer-utility-plate {
            min-height: 88px;
        }
        .b737-spine-label,
        .b737-module-title,
        .b737-card-label,
        .b737-local-label {
            font-size: 8px;
            letter-spacing: 0.12em;
            color: #d7d7cf;
            text-align: center;
            font-weight: bold;
        }
        .b737-module {
            background: linear-gradient(180deg, #26292b, #141617);
            border: 1px solid #575b5f;
            box-shadow: inset 0 0 12px rgba(0,0,0,0.55);
            border-radius: 1px;
            padding: 3px;
            min-height: 0;
        }
        .b737-meter-strip,
        .b737-fuel-qty-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 2px;
            background: #0a0a0a;
            border: 1px solid #4d5155;
            padding: 2px;
            margin: 2px 0 4px;
            text-align: center;
            color: #0f0;
            font-family: monospace;
            font-size: 10px;
        }
        .b737-authority-grid,
        .b737-light-grid,
        .b737-hyd-switches,
        .b737-knob-bank,
        .b737-process-status,
        .b737-footer-utility {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-start;
            align-items: flex-start;
            gap: 2px;
        }
        .b737-pump-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 2px;
            justify-items: start;
        }
        .b737-bleed-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 2px;
            justify-items: start;
        }
        .b737-start-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 2px;
            justify-items: start;
        }
        .b737-gauge-row {
            display: flex;
            justify-content: flex-start;
            gap: 4px;
            margin: 4px 0;
            flex-wrap: wrap;
        }
        .b737-press-gauges .gauge {
            transform: scale(0.88);
        }
        .boeing-overhead-grid-boeing_777_300er_overhead {
            grid-template-columns: 0.9fr 1.2fr 0.9fr;
            gap: 14px;
            padding: 8px 18px;
        }
        .boeing-overhead-grid-boeing_747_400_overhead {
            grid-template-columns: 1.12fr 1fr 0.88fr;
            gap: 12px;
            padding: 10px 14px;
        }
        .boeing-overhead-grid-boeing_757_200_overhead {
            grid-template-columns: 0.96fr 1.04fr 1fr;
            gap: 10px;
            padding: 8px 12px;
        }
        .overhead-layout-boeing_737_800_overhead {
            padding: 0;
            background: #191b1d;
            border-color: #666;
            overflow: hidden;
        }
        .overhead-layout-boeing_737_800_overhead .panel-section,
        .overhead-layout-boeing_737_800_overhead .b737-module {
            border-radius: 2px;
            background: linear-gradient(180deg, #26292b, #151718);
            border: 1px solid #575b5f;
            box-shadow: inset 0 0 12px rgba(0,0,0,0.55);
        }
        .overhead-layout-boeing_737_800_overhead .panel-title {
            font-size: 8px;
            letter-spacing: 0.12em;
            color: #d8d8d0;
            border-bottom-color: #666;
            margin-bottom: 2px;
            padding-bottom: 1px;
        }
        .overhead-layout-boeing_737_800_overhead .metallic-switch-wrapper,
        .overhead-layout-boeing_737_800_overhead .boeing-btn-wrapper {
            transform: scale(0.68);
            transform-origin: top left;
            margin: -6px !important;
        }
        .overhead-layout-boeing_737_800_overhead .digital-qty {
            font-size: 11px;
            padding: 1px 3px;
        }
        .overhead-layout-boeing_777_300er_overhead .panel-section,
        .overhead-layout-boeing_747_400_overhead .panel-section,
        .overhead-layout-boeing_757_200_overhead .panel-section {
            border-radius: 8px;
            background: linear-gradient(180deg, #202226, #111316);
            border-color: #4a4d52;
        }
        .airbus-overhead-grid {
            display: grid;
            grid-template-columns: 0.8fr 1.25fr 0.95fr;
            grid-template-rows: 0.82fr 1.15fr 1fr 0.72fr;
            grid-template-areas:
                "adirs fire lights"
                "hyd elec aircond"
                "fuel engine apu"
                "misc misc misc";
             gap: 4px;
        }
        .airbus-overhead-grid-airbus_a330_300_overhead {
            grid-template-columns: 0.92fr 1.18fr 0.9fr;
            grid-template-rows: 0.75fr 1.1fr 1.18fr 0.7fr;
            gap: 7px;
        }
        .airbus-overhead-grid-airbus_a350_900_overhead {
            grid-template-columns: 1fr 1.15fr 0.85fr;
            grid-template-rows: 0.75fr 1.18fr 0.95fr 0.78fr;
            grid-template-areas:
                "fire adirs lights"
                "elec aircond hyd"
                "fuel engine apu"
                "misc misc misc";
            gap: 8px;
        }
        .airbus-overhead-grid-airbus_a380_800_overhead {
            grid-template-columns: 1fr 0.95fr 1.05fr;
            grid-template-rows: 0.78fr 1.12fr 1.08fr 0.72fr;
            grid-template-areas:
                "fire lights adirs"
                "elec hyd aircond"
                "fuel engine apu"
                "misc misc misc";
            gap: 8px;
            padding: 6px 16px;
        }
        .panel-section {
            background: #1a1a1a; border: 2px solid #333;
            border-radius: 6px; padding: 5px; margin-bottom: 0;
        }
        .panel-title {
            margin: 0 0 5px 0; border-bottom: 1px solid #444;
            font-size: 12px; color: #ccc; text-align: center;
            padding-bottom: 2px;
        }
        .fuel-qty {
            text-align: center; font-size: 10px; color: #aaa;
        }
        .fuel-qty .digital {
            display: block; font-size: 14px; color: #fff; font-family: monospace;
        }
        .digital-qty {
            font-family: monospace; color: #ffaa00;
            background: #222; padding: 2px 5px; border: 1px solid #444;
            font-size: 14px; min-width: 40px; text-align: right;
        }
        /* Boeing Switch Animation */
        .boeing-switch { transition: background 0.2s; }
        .boeing-switch.active { background: linear-gradient(to right, #ccc, #eee, #ccc); }
      `}</style>
    </div>
  );
};

export default OverheadPanel;
