
import React, { useState, useEffect } from 'react';
import './RouteSelectionFrame.css';
import { generateWaypoints, generateSID, generateSTAR, generateGate, generateTaxiway, getRunways, generateRouteWaypoints, generateSmartRoute } from '../utils/routeGenerator';
import { useLanguage } from '../contexts/LanguageContext';

const RouteSelectionFrame = ({ 
  isOpen, 
  onConfirm, 
  onSkip, 
  difficulty, 
  departure, 
  arrival 
}) => {
  const { t } = useLanguage();
  const [routeData, setRouteData] = useState({
    departureGate: '',
    departureTaxiway: '',
    departureRunway: '',
    sid: '',
    waypoints: [],
    star: '',
    landingRunway: '',
    landingTaxiway: '',
    arrivalGate: ''
  });

  const [availableRunwaysDep, setAvailableRunwaysDep] = useState([]);
  const [availableRunwaysArr, setAvailableRunwaysArr] = useState([]);
  const [generatedWaypoints, setGeneratedWaypoints] = useState([]);
  const [isGeneratingRoute, setIsGeneratingRoute] = useState(false);

  useEffect(() => {
    if (isOpen && departure && arrival) {
      const depRunways = getRunways(departure);
      const arrRunways = getRunways(arrival);
      setAvailableRunwaysDep(depRunways);
      setAvailableRunwaysArr(arrRunways);

      const fetchRoute = async () => {
        setIsGeneratingRoute(true);
        const waypoints = await generateSmartRoute(departure, arrival);
        console.log('📍 Generated route waypoints:', waypoints);
        setGeneratedWaypoints(waypoints);

        const sid = generateSID((waypoints[0] && waypoints[0].name) || 'ABC');
        const star = generateSTAR((waypoints[waypoints.length - 1] && waypoints[waypoints.length - 1].name) || 'ABC');
        const depGate = generateGate();
        const arrGate = generateGate();
        const depTaxi = generateTaxiway();
        const arrTaxi = generateTaxiway();

        const isEastward = arrival.longitude > departure.longitude;
        const bestDepRunway = depRunways.length > 0 ? [...depRunways].sort((a, b) => parseInt(a) - parseInt(b))[isEastward ? 0 : depRunways.length - 1] : '';
        const bestArrRunway = arrRunways.length > 0 ? [...arrRunways].sort((a, b) => parseInt(a) - parseInt(b))[isEastward ? 0 : arrRunways.length - 1] : '';

        // Pre-fill based on difficulty to assist user
        // Or leave empty if "must set".
        // Let's pre-fill for everyone but require interaction for specific levels?
        // Actually, standard UX is pre-fill with smart defaults.
        
        const isAmateurOrHigher = ['amateur', 'intermediate', 'advanced', 'pro', 'devil'].includes(difficulty);
        const isIntermediateOrHigher = ['intermediate', 'advanced', 'pro', 'devil'].includes(difficulty);
        const isAdvancedOrHigher = ['advanced', 'pro', 'devil'].includes(difficulty);

        setRouteData({
          departureGate: isAmateurOrHigher ? '' : depGate, // Amateur+ must set
          departureTaxiway: depTaxi,
          departureRunway: isAmateurOrHigher ? '' : bestDepRunway, // Amateur+ must set
          sid: isAdvancedOrHigher ? '' : sid, // Advanced+ must set
          waypoints: isIntermediateOrHigher ? [] : waypoints, // Intermediate+ must set
          star: isAdvancedOrHigher ? '' : star, // Advanced+ must set
          landingRunway: isAmateurOrHigher ? '' : bestArrRunway, // Amateur+ must set
          landingTaxiway: arrTaxi,
          arrivalGate: isAmateurOrHigher ? '' : arrGate // Amateur+ must set
        });
        setIsGeneratingRoute(false);
      };

      fetchRoute();
    }
  }, [isOpen, departure, arrival, difficulty]);

  const handleChange = (field, value) => {
    setRouteData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateWaypoints = async () => {
     setIsGeneratingRoute(true);
     const wps = await generateSmartRoute(departure, arrival);
     setGeneratedWaypoints(wps);
     handleChange('waypoints', wps);
     
     // Also update SID/STAR if they depend on waypoints
     if (!routeData.sid) handleChange('sid', generateSID((wps[0] && wps[0].name) || 'ABC'));
     if (!routeData.star) handleChange('star', generateSTAR((wps[wps.length - 1] && wps[wps.length - 1].name) || 'ABC'));
     setIsGeneratingRoute(false);
  };

  const isFormValid = () => {
    if (difficulty === 'rookie') return true;

    // Amateur: Gate, Runway
    if (!routeData.departureGate || !routeData.departureRunway || 
        !routeData.arrivalGate || !routeData.landingRunway) {
        return false;
    }

    if (['intermediate', 'advanced', 'pro', 'devil'].includes(difficulty)) {
        // Intermediate: + Waypoints
        if (routeData.waypoints.length === 0) return false;
    }

    if (['advanced', 'pro', 'devil'].includes(difficulty)) {
        // Advanced+: + SID/STAR
        if (!routeData.sid || !routeData.star) return false;
    }

    return true;
  };

  if (!isOpen) return null;

  const showSkip = difficulty === 'rookie';
  const showSidStar = ['advanced', 'pro', 'devil'].includes(difficulty) || difficulty === 'rookie'; // Show for rookie (readonly/auto) or advanced (editable)
  // Actually, user said "Intermediate need not SID/STAR". Implies they shouldn't bother with it.
  // But for Rookie "skip this", it implies they see it but can skip.
  
  // Let's just show all fields but disable/hide based on difficulty?
  // "Intermediate need not SID/STAR" -> Hide it?
  
  const showWaypoints = ['intermediate', 'advanced', 'pro', 'devil', 'rookie'].includes(difficulty);
  const showSidStarFields = ['advanced', 'pro', 'devil', 'rookie'].includes(difficulty);

  return (
    <div className="route-selection-overlay">
      <div className="route-selection-frame">
        <h2>{t('route_selection.title')}</h2>
        <div className="route-difficulty-badge">{t('route_selection.mode', { difficulty: difficulty.toUpperCase() })}</div>
        
        <div className="route-grid">
          {/* Departure Section */}
          <div className="route-section">
            <h3>{t('route_selection.departure', { airport: departure?.iata })}</h3>
            
            <div className="form-group">
              <label>{t('route_selection.gate_ramp')}</label>
              <input 
                type="text" 
                value={routeData.departureGate} 
                onChange={(e) => handleChange('departureGate', e.target.value)}
                placeholder={t('route_selection.placeholder_gate')}
              />
              <button className="generate-btn" onClick={() => handleChange('departureGate', generateGate())}>🎲</button>
            </div>

            <div className="form-group">
              <label>{t('route_selection.taxiway')}</label>
              <input 
                type="text" 
                value={routeData.departureTaxiway} 
                onChange={(e) => handleChange('departureTaxiway', e.target.value)}
                placeholder={t('route_selection.placeholder_taxi')}
              />
            </div>

            <div className="form-group">
              <label>{t('route_selection.runway')}</label>
              <select 
                value={routeData.departureRunway} 
                onChange={(e) => handleChange('departureRunway', e.target.value)}
              >
                <option value="">{t('route_selection.select_runway')}</option>
                {availableRunwaysDep.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {showSidStarFields && (
              <div className="form-group">
                <label>{t('route_selection.sid')}</label>
                <input 
                  type="text" 
                  value={routeData.sid} 
                  onChange={(e) => handleChange('sid', e.target.value)}
                  placeholder={t('route_selection.placeholder_sid')}
                />
                <button className="generate-btn" onClick={() => handleChange('sid', generateSID((routeData.waypoints[0] && routeData.waypoints[0].name) || 'ABC'))}>🎲</button>
              </div>
            )}
          </div>

          {/* Enroute Section */}
          {showWaypoints && (
            <div className="route-section center-section">
              <h3>{t('route_selection.enroute')}</h3>
              <div className="form-group full-width">
                 <label>{t('route_selection.waypoints')}</label>
                 <div className="waypoints-display">
                    {Array.isArray(routeData.waypoints) && routeData.waypoints.length > 0
                      ? routeData.waypoints.map(wp => typeof wp === 'string' ? wp : (wp.name || 'WPT')).join(' ➝ ')
                      : ''}
                 </div>
                 <button className="action-btn" onClick={handleGenerateWaypoints} disabled={isGeneratingRoute}>
                   {isGeneratingRoute ? t('common.loading') : t('route_selection.generate')}
                 </button>
              </div>
            </div>
          )}

          {/* Arrival Section */}
          <div className="route-section">
            <h3>{t('route_selection.arrival', { airport: arrival?.iata })}</h3>
            
            {showSidStarFields && (
              <div className="form-group">
                <label>{t('route_selection.star')}</label>
                <input 
                  type="text" 
                  value={routeData.star} 
                  onChange={(e) => handleChange('star', e.target.value)}
                  placeholder="e.g. DXB45A"
                />
                <button className="generate-btn" onClick={() => handleChange('star', generateSTAR(((routeData.waypoints[routeData.waypoints.length-1] && routeData.waypoints[routeData.waypoints.length-1].name) || 'ABC')))}>🎲</button>
              </div>
            )}

             <div className="form-group">
              <label>{t('route_selection.runway')}</label>
              <select 
                value={routeData.landingRunway} 
                onChange={(e) => handleChange('landingRunway', e.target.value)}
              >
                <option value="">{t('route_selection.select_runway')}</option>
                {availableRunwaysArr.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>{t('route_selection.taxiway')}</label>
              <input 
                type="text" 
                value={routeData.landingTaxiway} 
                onChange={(e) => handleChange('landingTaxiway', e.target.value)}
                placeholder={t('route_selection.placeholder_taxi')}
              />
            </div>

            <div className="form-group">
              <label>{t('route_selection.gate_ramp')}</label>
              <input 
                type="text" 
                value={routeData.arrivalGate} 
                onChange={(e) => handleChange('arrivalGate', e.target.value)}
                placeholder={t('route_selection.placeholder_gate')}
              />
              <button className="generate-btn" onClick={() => handleChange('arrivalGate', generateGate())}>🎲</button>
            </div>
          </div>
        </div>

        <div className="route-actions">
          {showSkip && (
            <button className="skip-btn" onClick={onSkip}>
              {t('route_selection.skip')}
            </button>
          )}
          <button 
            className="confirm-btn" 
            onClick={() => onConfirm(routeData)}
            disabled={!isFormValid()}
          >
            {t('route_selection.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteSelectionFrame;
