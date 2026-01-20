import React, { useState, useEffect } from 'react';
import { airportService } from '../services/airportService';
import './FlightComputerPanel.css';

const FlightComputerPanel = ({ onClose, flightPlan, onUpdateFlightPlan, flightState }) => {
  const [activeTab, setActiveTab] = useState('waypoints'); // 'waypoints', 'add', 'nearest'
  const [waypoints, setWaypoints] = useState([]);
  
  // Manual Input State
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [manualLabel, setManualLabel] = useState('');
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchType, setSearchType] = useState('all'); // 'all', 'normal', 'emergency'
  
  // Nearest State
  const [nearestAirports, setNearestAirports] = useState([]);
  const [loadingNearest, setLoadingNearest] = useState(false);

  // Utils State
  const [utilsTargetAlt, setUtilsTargetAlt] = useState(35000);
  const [convertVal, setConvertVal] = useState('');
  const [convertFrom, setConvertFrom] = useState('ft');
  const [convertTo, setConvertTo] = useState('m');
  const [convertResult, setConvertResult] = useState(null);

  // Auto-convert when inputs change
  useEffect(() => {
    const val = parseFloat(convertVal);
    if (isNaN(val)) {
        setConvertResult(null);
        return;
    }
    
    let res = 0;
    // Conversions
    if (convertFrom === 'ft' && convertTo === 'm') res = val * 0.3048;
    else if (convertFrom === 'm' && convertTo === 'ft') res = val / 0.3048;
    else if (convertFrom === 'kts' && convertTo === 'kmh') res = val * 1.852;
    else if (convertFrom === 'kmh' && convertTo === 'kts') res = val / 1.852;
    else if (convertFrom === 'inHg' && convertTo === 'hPa') res = val * 33.8639;
    else if (convertFrom === 'hPa' && convertTo === 'inHg') res = val / 33.8639;
    else if (convertFrom === 'nm' && convertTo === 'km') res = val * 1.852;
    else if (convertFrom === 'km' && convertTo === 'nm') res = val / 1.852;
    else if (convertFrom === convertTo) res = val;
    
    setConvertResult(res);
  }, [convertVal, convertFrom, convertTo]);

  const calculatePredictions = () => {
     // Time to WPT
     let timeToWpt = '---';
     let distToWpt = '---';
     let nextWpLabel = '---';
     
     if (waypoints.length > 0 && flightState.groundSpeed > 10) {
         // flightState.currentWaypointIndex might be undefined if not passed yet, handle gracefully
         let nextIdx = flightState.currentWaypointIndex || 0;
         
         // If index is past end, we are done
         if (nextIdx < waypoints.length) {
             const wp = waypoints[nextIdx];
             nextWpLabel = wp.label || `WP${nextIdx+1}`;
             
             // Simple haversine or use service
             // We can use airportService.calculateDistance even for non-airports if we pass {latitude, longitude}
             const dist = airportService.calculateDistance(
                 {latitude: flightState.latitude, longitude: flightState.longitude},
                 {latitude: wp.latitude, longitude: wp.longitude}
             );
             distToWpt = dist.toFixed(1) + ' nm';
             
             // Time = Dist / Speed
             const hours = dist / flightState.groundSpeed;
             const mins = Math.floor(hours * 60);
             const secs = Math.floor((hours * 3600) % 60);
             timeToWpt = `${mins}m ${secs}s`;
         } else {
             nextWpLabel = 'End of Flight Plan';
         }
     }
     
     // Fuel
     let timeFuel = '---';
     const totalFlow = (flightState.engineFuelFlow || [0,0]).reduce((a,b)=>a+b, 0); // kg/s
     let flowKgH = 0;
     if (totalFlow > 0.01) {
         flowKgH = totalFlow * 3600;
         const fuelKg = flightState.fuel || 0;
         const hours = fuelKg / flowKgH;
         const mins = Math.floor(hours * 60);
         timeFuel = `${Math.floor(hours)}h ${mins%60}m`;
     }
     
     // Altitude
     let timeAlt = '---';
     const vs = flightState.verticalSpeed; // ft/min
     if (Math.abs(vs) > 50) {
         const diff = utilsTargetAlt - (flightState.altitude || 0);
         // If moving in right direction
         if ((diff > 0 && vs > 0) || (diff < 0 && vs < 0)) {
             const mins = Math.abs(diff / vs);
             timeAlt = `${Math.floor(mins)}m ${Math.floor((mins%1)*60)}s`;
         } else {
             timeAlt = 'Wrong VS Direction';
         }
     } else {
         timeAlt = 'Stable';
     }
     
     return { timeToWpt, distToWpt, nextWpLabel, timeFuel, timeAlt, totalFlow: flowKgH };
  };

  const preds = calculatePredictions();

  // Initialize local state from props
  useEffect(() => {
    if (flightPlan) {
      // Handle both array and object formats
      if (Array.isArray(flightPlan)) {
        setWaypoints(flightPlan);
      } else if (flightPlan.waypoints && Array.isArray(flightPlan.waypoints)) {
        setWaypoints(flightPlan.waypoints);
      }
    }
  }, [flightPlan]);

  // Sync changes to parent
  const updateParent = (newWaypoints) => {
    setWaypoints(newWaypoints);
    if (onUpdateFlightPlan) {
      // Send as object to be explicit, or array?
      // Physics service now handles both. Let's send array to match initial state structure in FlightInProgress.
      // Wait, FlightInProgress expects whatever setWaypoints accepts.
      // If we send array, it's fine.
      onUpdateFlightPlan(newWaypoints);
    }
  };

  const handleDeleteWaypoint = (index) => {
    const newWaypoints = [...waypoints];
    newWaypoints.splice(index, 1);
    updateParent(newWaypoints);
  };

  const handleToggleHold = (index) => {
    const newWaypoints = [...waypoints];
    newWaypoints[index] = { 
      ...newWaypoints[index], 
      isHold: !newWaypoints[index].isHold 
    };
    updateParent(newWaypoints);
  };

  const handleAddManual = () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    
    if (isNaN(lat) || isNaN(lon)) {
      alert('Please enter valid coordinates');
      return;
    }
    
    const newWaypoint = {
      latitude: lat,
      longitude: lon,
      label: manualLabel || `WPT${waypoints.length + 1}`,
      type: 'user'
    };
    
    const newWaypoints = [...waypoints, newWaypoint];
    updateParent(newWaypoints);
    
    // Reset inputs
    setManualLat('');
    setManualLon('');
    setManualLabel('');
    setActiveTab('waypoints');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.length < 2) return;
    
    const results = airportService.searchAirports(searchQuery, { 
      type: searchType === 'all' ? 'all' : searchType,
      includeEmergency: searchType === 'emergency' || searchType === 'all'
    });
    setSearchResults(results);
  };

  const handleAddAirport = (airport) => {
    // Extract individual runway designators (e.g. "08L/26R" -> ["08L", "26R"])
    const runwayOptions = [];
    if (airport.runways) {
      airport.runways.forEach(r => {
        const parts = r.name.split('/');
        parts.forEach(p => runwayOptions.push(p.trim()));
      });
    }

    const newWaypoint = {
      latitude: airport.latitude,
      longitude: airport.longitude,
      label: airport.iata || airport.icao,
      type: 'airport',
      details: airport,
      selectedRunway: runwayOptions.length > 0 ? runwayOptions[0] : null
    };
    
    const newWaypoints = [...waypoints, newWaypoint];
    updateParent(newWaypoints);
    setActiveTab('waypoints');
  };

  const handleRunwayChange = (index, runway) => {
    const newWaypoints = [...waypoints];
    newWaypoints[index] = { ...newWaypoints[index], selectedRunway: runway };
    updateParent(newWaypoints);
  };

  const findNearestAirports = () => {
    if (!flightState || !flightState.latitude || !flightState.longitude) return;
    
    setLoadingNearest(true);
    
    // Get ALL airports and sort by distance (simple, robust approach)
    const allAirports = airportService.getAllAirports();
    
    // Create a lightweight array for sorting to avoid mutating original or heavy operations
    const airportsWithDist = allAirports.map(airport => {
      const distance = airportService.calculateDistance(
        { latitude: flightState.latitude, longitude: flightState.longitude },
        { latitude: airport.latitude, longitude: airport.longitude }
      );
      return { airport, distance };
    });
    
    // Sort by distance ascending
    airportsWithDist.sort((a, b) => a.distance - b.distance);
    
    // Take top 20 and extract the airport object
    const results = airportsWithDist.slice(0, 20).map(item => item.airport);
    
    setNearestAirports(results);
    setLoadingNearest(false);
  };

  useEffect(() => {
    if (activeTab === 'nearest') {
      findNearestAirports();
    }
  }, [activeTab]);

  return (
    <div className="flight-computer-panel">
      <div className="fc-header">
        <h3>Flight Computer</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="fc-tabs">
        <button className={activeTab === 'waypoints' ? 'active' : ''} onClick={() => setActiveTab('waypoints')}>Plan</button>
        <button className={activeTab === 'add' ? 'active' : ''} onClick={() => setActiveTab('add')}>Add</button>
        <button className={activeTab === 'nearest' ? 'active' : ''} onClick={() => setActiveTab('nearest')}>Nearest</button>
        <button className={activeTab === 'utils' ? 'active' : ''} onClick={() => setActiveTab('utils')}>Perf</button>
      </div>
      
      <div className="fc-content">
        {activeTab === 'waypoints' && (
          <div className="waypoints-list">
            {waypoints.length === 0 ? (
              <div className="empty-state">No waypoints in flight plan.</div>
            ) : (
              <ul>
                {waypoints.map((wp, index) => (
                  <li key={index} className="waypoint-item">
                    <span className="wp-index">{index + 1}</span>
                    <div className="wp-info">
                      <span className="wp-label">{wp.label}</span>
                      <span className="wp-coords">{wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)}</span>
                      {wp.type === 'airport' && wp.details?.runways && (
                        <select 
                          value={wp.selectedRunway || ''} 
                          onChange={(e) => handleRunwayChange(index, e.target.value)}
                          className="runway-select"
                          onClick={(e) => e.stopPropagation()}
                          style={{ 
                            marginLeft: '8px', 
                            padding: '2px 4px', 
                            fontSize: '11px',
                            background: '#333',
                            color: '#0f0',
                            border: '1px solid #0f0',
                            borderRadius: '3px'
                          }}
                        >
                          {wp.details.runways.flatMap(r => r.name.split('/').map(p => p.trim())).map(r => (
                            <option key={r} value={r}>RWY {r}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <button 
                      className="hold-btn" 
                      onClick={() => handleToggleHold(index)}
                      style={{
                        marginLeft: '8px',
                        background: wp.isHold ? '#eab308' : '#334155',
                        color: wp.isHold ? 'black' : 'white',
                        border: '1px solid #475569',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        padding: '2px 6px',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                      }}
                      title="Toggle Hold Pattern (Orbit)"
                    >
                      {wp.isHold ? 'HOLDING' : 'HOLD'}
                    </button>
                    <button className="delete-btn" onClick={() => handleDeleteWaypoint(index)}>🗑️</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        
        {activeTab === 'add' && (
          <div className="add-waypoint-section">
            <div className="manual-input">
              <h4>Manual Entry</h4>
              <div className="input-group">
                <input 
                  type="text" 
                  placeholder="Lat (e.g. 37.61)" 
                  value={manualLat} 
                  onChange={(e) => setManualLat(e.target.value)} 
                />
                <input 
                  type="text" 
                  placeholder="Lon (e.g. -122.37)" 
                  value={manualLon} 
                  onChange={(e) => setManualLon(e.target.value)} 
                />
              </div>
              <input 
                type="text" 
                placeholder="Label (Optional)" 
                value={manualLabel} 
                onChange={(e) => setManualLabel(e.target.value)} 
                className="label-input"
              />
              <button className="action-btn" onClick={handleAddManual}>Add Coordinates</button>
            </div>
            
            <div className="divider">OR</div>
            
            <div className="search-input">
              <h4>Airport Search</h4>
              <form onSubmit={handleSearch}>
                <input 
                  type="text" 
                  placeholder="Search ICAO/IATA/Name..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
                <div className="search-options">
                   <label>
                     <input 
                       type="radio" 
                       checked={searchType === 'all'} 
                       onChange={() => setSearchType('all')} 
                     /> All
                   </label>
                   <label>
                     <input 
                       type="radio" 
                       checked={searchType === 'normal'} 
                       onChange={() => setSearchType('normal')} 
                     /> Normal
                   </label>
                   <label>
                     <input 
                       type="radio" 
                       checked={searchType === 'emergency'} 
                       onChange={() => setSearchType('emergency')} 
                     /> Emergency
                   </label>
                </div>
                <button type="submit" className="action-btn secondary">Search</button>
              </form>
              
              <div className="search-results">
                {searchResults.map(airport => (
                  <div key={airport.icao} className="search-result-item">
                    <div className="airport-info">
                      <span className="airport-code">{airport.iata}/{airport.icao}</span>
                      <span className="airport-name">{airport.name}</span>
                    </div>
                    <button className="add-btn" onClick={() => handleAddAirport(airport)}>+</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'nearest' && (
          <div className="nearest-section">
            {loadingNearest ? (
              <div>Finding airports...</div>
            ) : nearestAirports.length === 0 ? (
              <div>No airports found.</div>
            ) : (
              <ul className="nearest-list">
                {nearestAirports.map(airport => {
                   const dist = airportService.calculateDistance(
                     { latitude: flightState.latitude, longitude: flightState.longitude },
                     { latitude: airport.latitude, longitude: airport.longitude }
                   );
                   return (
                    <li key={airport.icao} className="nearest-item">
                      <div className="airport-details">
                        <span className="code">{airport.iata || airport.icao}</span>
                        <span className="name">{airport.name}</span>
                        <span className="dist">{dist} nm</span>
                        {airport.type === 'emergency' && <span className="tag emergency">EMERGENCY</span>}
                      </div>
                      <button className="direct-btn" onClick={() => handleAddAirport(airport)}>Add</button>
                    </li>
                   );
                })}
              </ul>
            )}
            <button className="refresh-btn" onClick={findNearestAirports}>Refresh</button>
          </div>
        )}
        
        {activeTab === 'utils' && (
          <div className="utils-section" style={{ padding: '10px', color: '#e2e8f0' }}>
            
            <div className="utils-block" style={{ marginBottom: '20px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px' }}>
              <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #475569', paddingBottom: '5px' }}>Predictions</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div style={{ color: '#94a3b8' }}>Next Waypoint:</div>
                <div style={{ textAlign: 'right', fontWeight: 'bold' }}>{preds.nextWpLabel}</div>
                
                <div style={{ color: '#94a3b8' }}>Distance:</div>
                <div style={{ textAlign: 'right' }}>{preds.distToWpt}</div>
                
                <div style={{ color: '#94a3b8' }}>ETE to WPT:</div>
                <div style={{ textAlign: 'right', color: '#4ade80' }}>{preds.timeToWpt}</div>
                
                <div style={{ borderTop: '1px solid #334155', gridColumn: '1/-1', margin: '4px 0' }}></div>
                
                <div style={{ color: '#94a3b8' }}>Fuel Flow:</div>
                <div style={{ textAlign: 'right' }}>{preds.totalFlow.toFixed(0)} kg/h</div>
                
                <div style={{ color: '#94a3b8' }}>Time to Empty:</div>
                <div style={{ textAlign: 'right', color: '#f59e0b' }}>{preds.timeFuel}</div>
                
                <div style={{ borderTop: '1px solid #334155', gridColumn: '1/-1', margin: '4px 0' }}></div>
                
                <div style={{ color: '#94a3b8', alignSelf: 'center' }}>Target Alt (ft):</div>
                <div style={{ textAlign: 'right' }}>
                  <input 
                    type="number" 
                    value={utilsTargetAlt} 
                    onChange={(e) => setUtilsTargetAlt(parseFloat(e.target.value))}
                    style={{ width: '60px', background: '#1e293b', border: '1px solid #475569', color: 'white', padding: '2px' }}
                  />
                </div>
                
                <div style={{ color: '#94a3b8' }}>Time to Alt:</div>
                <div style={{ textAlign: 'right', color: '#60a5fa' }}>{preds.timeAlt}</div>
              </div>
            </div>

            <div className="utils-block" style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px' }}>
              <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #475569', paddingBottom: '5px' }}>Unit Converter</h4>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input 
                  type="number" 
                  value={convertVal} 
                  onChange={(e) => setConvertVal(e.target.value)}
                  placeholder="Value"
                  style={{ flex: 1, background: '#1e293b', border: '1px solid #475569', color: 'white', padding: '4px' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                <select 
                  value={convertFrom} 
                  onChange={(e) => setConvertFrom(e.target.value)}
                  style={{ background: '#1e293b', border: '1px solid #475569', color: 'white', padding: '4px', flex: 1 }}
                >
                  <option value="ft">Feet (ft)</option>
                  <option value="m">Meters (m)</option>
                  <option value="kts">Knots (kts)</option>
                  <option value="kmh">Km/h</option>
                  <option value="inHg">inHg</option>
                  <option value="hPa">hPa</option>
                  <option value="nm">Naut. Miles</option>
                  <option value="km">Kilometers</option>
                </select>
                
                <span>→</span>
                
                <select 
                  value={convertTo} 
                  onChange={(e) => setConvertTo(e.target.value)}
                  style={{ background: '#1e293b', border: '1px solid #475569', color: 'white', padding: '4px', flex: 1 }}
                >
                  <option value="ft">Feet (ft)</option>
                  <option value="m">Meters (m)</option>
                  <option value="kts">Knots (kts)</option>
                  <option value="kmh">Km/h</option>
                  <option value="inHg">inHg</option>
                  <option value="hPa">hPa</option>
                  <option value="nm">Naut. Miles</option>
                  <option value="km">Kilometers</option>
                </select>
              </div>
              
              <div style={{ textAlign: 'center', padding: '10px', background: '#0f172a', borderRadius: '4px', border: '1px solid #334155' }}>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Result: </span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>
                  {convertResult !== null ? convertResult.toFixed(2) : '---'}
                </span>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
};

export default FlightComputerPanel;
