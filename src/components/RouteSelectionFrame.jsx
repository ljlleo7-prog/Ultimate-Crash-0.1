import React, { useEffect, useState } from 'react';
import './RouteSelectionFrame.css';
import { generateSID, generateSTAR, generateGate, generateTaxiway, getLastProcedureWaypoint, getRunways, generateSmartRouteDetails, procedureMatchesWaypoint } from '../utils/routeGenerator';
import LocalRouteMap from './LocalRouteMap';
import { calculateDistance } from '../utils/distanceCalculator';

const calcRouteDistance = (departure, waypoints, arrival) => {
  const pts = [departure, ...(waypoints || []), arrival].filter(p => p?.latitude != null && p?.longitude != null);
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    total += calculateDistance(pts[i].latitude, pts[i].longitude, pts[i+1].latitude, pts[i+1].longitude);
  }
  return Math.round(total);
};

const DEFAULT_ROUTE_DATA = {
  departureGate: '',
  departureTaxiway: '',
  departureRunway: '',
  sid: '',
  waypoints: [],
  star: '',
  landingRunway: '',
  landingTaxiway: '',
  arrivalGate: '',
  routeObject: null,
  routeSource: '',
  routeFallbackUsed: false,
  routeDebug: [],
  routeBilling: null
};

const RouteSelectionFrame = ({ isOpen, onConfirm, onSkip, onChange, difficulty, departure, arrival, routeData: externalRouteData }) => {
  const [routeData, setRouteData] = useState(DEFAULT_ROUTE_DATA);
  const [availableRunwaysDep, setAvailableRunwaysDep] = useState([]);
  const [availableRunwaysArr, setAvailableRunwaysArr] = useState([]);
  const [isGeneratingRoute, setIsGeneratingRoute] = useState(false);
  const [manualWaypoints, setManualWaypoints] = useState('');

  useEffect(() => {
    if (externalRouteData) {
      setRouteData({ ...DEFAULT_ROUTE_DATA, ...externalRouteData });
      if (externalRouteData.waypoints?.length) {
        setManualWaypoints(externalRouteData.waypoints.map(w => typeof w === 'string' ? w : w.name).join(' '));
      }
    }
  }, [externalRouteData]);

  useEffect(() => {
    if (!isOpen || !departure || !arrival) return;

    const depRunways = getRunways(departure);
    const arrRunways = getRunways(arrival);
    setAvailableRunwaysDep(depRunways);
    setAvailableRunwaysArr(arrRunways);

    const shouldHydrateDefaults = !externalRouteData || (!externalRouteData.waypoints?.length && !externalRouteData.departureRunway && !externalRouteData.landingRunway);
    if (!shouldHydrateDefaults) return;

    const fetchRoute = async () => {
      setIsGeneratingRoute(true);
      const routeObject = await generateSmartRouteDetails(departure, arrival);
      const waypoints = routeObject.waypoints || [];
      const sid = generateSID((waypoints[0] && waypoints[0].name) || 'ABC');
      const star = generateSTAR(getLastProcedureWaypoint(waypoints) || (waypoints[waypoints.length - 1] && waypoints[waypoints.length - 1].name) || 'ABC');
      const depGate = generateGate();
      const arrGate = generateGate();
      const depTaxi = generateTaxiway();
      const arrTaxi = generateTaxiway();
      const isEastward = arrival.longitude > departure.longitude;
      const bestDepRunway = depRunways.length > 0 ? [...depRunways].sort((a, b) => parseInt(a) - parseInt(b))[isEastward ? 0 : depRunways.length - 1] : '';
      const bestArrRunway = arrRunways.length > 0 ? [...arrRunways].sort((a, b) => parseInt(a) - parseInt(b))[isEastward ? 0 : arrRunways.length - 1] : '';
      const isAmateurOrHigher = ['amateur', 'intermediate', 'advanced', 'pro', 'devil'].includes(difficulty);
      const isIntermediateOrHigher = ['intermediate', 'advanced', 'pro', 'devil'].includes(difficulty);
      const isAdvancedOrHigher = ['advanced', 'pro', 'devil'].includes(difficulty);

      const nextRoute = {
        departureGate: isAmateurOrHigher ? '' : depGate,
        departureTaxiway: depTaxi,
        departureRunway: isAmateurOrHigher ? '' : bestDepRunway,
        sid: isAdvancedOrHigher ? '' : sid,
        waypoints,
        star: isAdvancedOrHigher ? '' : star,
        landingRunway: isAmateurOrHigher ? '' : bestArrRunway,
        landingTaxiway: arrTaxi,
        arrivalGate: isAmateurOrHigher ? '' : arrGate,
        routeObject,
        routeSource: routeObject.source,
        routeFallbackUsed: routeObject.fallbackUsed,
        routeDebug: routeObject.debug || [],
        routeBilling: routeObject.billing || null
      };

      setRouteData(nextRoute);
      onChange?.(nextRoute);
      setManualWaypoints(waypoints.map(w => typeof w === 'string' ? w : w.name).join(' '));
      setIsGeneratingRoute(false);
    };

    fetchRoute();
  }, [isOpen, departure, arrival, difficulty, externalRouteData, onChange]);

  const handleChange = (field, value) => {
    const next = { ...routeData, [field]: value };
    setRouteData(next);
    onChange?.(next);
  };

  const handleGenerateWaypoints = async () => {
    setIsGeneratingRoute(true);
    const routeObject = await generateSmartRouteDetails(departure, arrival);
    const wps = routeObject.waypoints || [];
    const next = {
      ...routeData,
      waypoints: wps,
      routeObject,
      routeSource: routeObject.source,
      routeFallbackUsed: routeObject.fallbackUsed,
      routeDebug: routeObject.debug || [],
      routeBilling: routeObject.billing || null,
      sid: routeData.sid || generateSID((wps[0] && wps[0].name) || 'ABC'),
      star: routeData.star || generateSTAR(getLastProcedureWaypoint(wps) || ((wps[wps.length - 1] && wps[wps.length - 1].name) || 'ABC'))
    };
    setManualWaypoints(wps.map(w => typeof w === 'string' ? w : w.name).join(' '));
    setRouteData(next);
    onChange?.(next);
    setIsGeneratingRoute(false);
  };

  const handleManualWaypointsChange = (value) => {
    setManualWaypoints(value);
    const wps = value.split(/[\s,]+/).filter(Boolean).map(name => ({ name, type: 'WAYPOINT' }));
    const next = { ...routeData, waypoints: wps };
    setRouteData(next);
    onChange?.(next);
  };

  const isFormValid = () => {
    if (difficulty === 'rookie') return true;
    if (!routeData.departureGate || !routeData.departureRunway || !routeData.arrivalGate || !routeData.landingRunway) return false;
    if (['intermediate', 'advanced', 'pro', 'devil'].includes(difficulty) && routeData.waypoints.length === 0) return false;
    if (['advanced', 'pro', 'devil'].includes(difficulty) && (!routeData.sid || !routeData.star)) return false;
    const firstWaypoint = routeData.waypoints[0]?.name || routeData.waypoints[0] || '';
    const lastWaypoint = getLastProcedureWaypoint(routeData.waypoints) || '';
    if (routeData.sid && firstWaypoint && !procedureMatchesWaypoint(routeData.sid, firstWaypoint)) return false;
    if (routeData.star && lastWaypoint && !procedureMatchesWaypoint(routeData.star, lastWaypoint)) return false;
    return true;
  };

  if (!isOpen) return null;

  const showSkip = difficulty === 'rookie';
  const showWaypoints = ['intermediate', 'advanced', 'pro', 'devil', 'rookie'].includes(difficulty);
  const showSidStarFields = ['advanced', 'pro', 'devil', 'rookie'].includes(difficulty);

  return (
    <div className="route-selection-overlay">
      <div className="route-selection-frame">
        <h2>Detailed Route Selection</h2>
        <div className="route-difficulty-badge">{difficulty.toUpperCase()} MODE</div>

        <div className="route-grid">
          <div className="route-section">
            <h3>Departure ({departure?.iata})</h3>
            <div className="form-group">
              <label>Gate/Ramp</label>
              <input type="text" value={routeData.departureGate} onChange={(e) => handleChange('departureGate', e.target.value)} placeholder="e.g. A12" />
              <button className="generate-btn" onClick={() => handleChange('departureGate', generateGate())}>🎲</button>
            </div>
            <div className="form-group">
              <label>Taxiway</label>
              <input type="text" value={routeData.departureTaxiway} onChange={(e) => handleChange('departureTaxiway', e.target.value)} placeholder="e.g. A" />
            </div>
            <div className="form-group">
              <label>Runway</label>
              <select value={routeData.departureRunway} onChange={(e) => handleChange('departureRunway', e.target.value)}>
                <option value="">Select Runway</option>
                {availableRunwaysDep.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {showSidStarFields && (
              <div className="form-group">
                <label>SID</label>
                <input type="text" value={routeData.sid} onChange={(e) => handleChange('sid', e.target.value)} placeholder="e.g. OMA12D" />
                <button className="generate-btn" onClick={() => handleChange('sid', generateSID((routeData.waypoints[0] && routeData.waypoints[0].name) || 'ABC'))}>🎲</button>
              </div>
            )}
          </div>

          {showWaypoints && (
            <div className="route-section center-section">
              <h3>Enroute</h3>
              <div className="form-group full-width">
                <label>Waypoints <span style={{fontWeight:'normal',color:'#aaa',fontSize:'11px'}}>(space-separated)</span></label>
                <input
                  type="text"
                  value={manualWaypoints}
                  onChange={(e) => handleManualWaypointsChange(e.target.value)}
                  placeholder="e.g. ALPHA BRAVO CHARLIE"
                />
                <button className="action-btn" onClick={handleGenerateWaypoints} disabled={isGeneratingRoute}>
                  {isGeneratingRoute ? 'Generating...' : 'Auto-Generate'}
                </button>
              </div>
              {routeData.routeSource && (
                <div className="form-group full-width" style={{marginTop:'4px'}}>
                  <label>Route Source</label>
                  <div className="waypoints-display">
                    {routeData.routeSource}{routeData.routeFallbackUsed ? ' (fallback)' : ''}
                    {routeData.routeBilling?.chargedTokens ? ` · ${routeData.routeBilling.chargedTokens} token` : ' · 0 tokens'}
                  </div>
                </div>
              )}
              <div className="form-group full-width" style={{marginTop:'8px'}}>
                <label>Local Route Preview</label>
                <LocalRouteMap departure={departure} arrival={arrival} waypoints={routeData.waypoints} routeObject={routeData.routeObject} />
              </div>
            </div>
          )}

          <div className="route-section">
            <h3>Arrival ({arrival?.iata})</h3>
            {showSidStarFields && (
              <div className="form-group">
                <label>STAR</label>
                <input type="text" value={routeData.star} onChange={(e) => handleChange('star', e.target.value)} placeholder="e.g. DXB45A" />
                <button className="generate-btn" onClick={() => handleChange('star', generateSTAR((getLastProcedureWaypoint(routeData.waypoints) || ((routeData.waypoints[routeData.waypoints.length - 1] && routeData.waypoints[routeData.waypoints.length - 1].name) || 'ABC'))))}>🎲</button>
              </div>
            )}
            <div className="form-group">
              <label>Runway</label>
              <select value={routeData.landingRunway} onChange={(e) => handleChange('landingRunway', e.target.value)}>
                <option value="">Select Runway</option>
                {availableRunwaysArr.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Taxiway</label>
              <input type="text" value={routeData.landingTaxiway} onChange={(e) => handleChange('landingTaxiway', e.target.value)} placeholder="e.g. B" />
            </div>
            <div className="form-group">
              <label>Gate/Ramp</label>
              <input type="text" value={routeData.arrivalGate} onChange={(e) => handleChange('arrivalGate', e.target.value)} placeholder="e.g. D05" />
              <button className="generate-btn" onClick={() => handleChange('arrivalGate', generateGate())}>🎲</button>
            </div>
          </div>
        </div>

        <div className="route-actions">
          {showSkip && <button className="skip-btn" onClick={onSkip}>Skip (Use Defaults)</button>}
          <button className="confirm-btn" onClick={() => onConfirm(routeData)} disabled={!isFormValid()}>Confirm Flight Plan</button>
        </div>
      </div>
    </div>
  );
};

export default RouteSelectionFrame;
